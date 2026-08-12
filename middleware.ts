import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Gates every /admin/* page and every /api/admin/* + admin lead-update route
// behind a real Supabase Auth session. Also forces a password change before
// letting a first-login account (must_change_password=true) reach anything else.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() (not getUser(), and never getSession() alone) verifies the
  // session token here. This project signs its JWTs with an asymmetric ES256
  // key, so getClaims() fetches the JWKS once per server process - it is cached
  // module-wide in auth-js, across every client instance - and then verifies
  // each token's signature locally with WebCrypto.
  //
  // This is a real cryptographic verification, not a decode: a tampered,
  // unsigned, or expired token is rejected, and `exp` is checked by default. It
  // replaces getUser(), which sent a network request to Supabase's auth server
  // on EVERY admin page load and EVERY admin API call - measured at ~450ms per
  // call from here, and by far the largest single source of dashboard latency.
  //
  // The one thing it gives up: a session revoked server-side mid-token is not
  // detected, so a signed-out or deleted account keeps access until its access
  // token expires (Supabase default: 1 hour). Shorten the project's JWT expiry
  // if that window needs to be tighter.
  //
  // Session refresh is unaffected - getClaims() calls getSession() internally,
  // which refreshes an about-to-expire token before validating it, so the
  // setAll() handler above still writes refreshed cookies exactly as before.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims ? { id: claims.claims.sub } : null;

  const isApiAdmin = pathname.startsWith("/api/admin");
  const isApiLeadUpdate = pathname.startsWith("/api/leads/") && pathname !== "/api/leads";
  const isLoginPage = pathname === "/admin/login";
  const isSetPasswordPage = pathname === "/admin/set-password";
  const isAdminPage = pathname.startsWith("/admin");

  if ((isApiAdmin || isApiLeadUpdate) && !user) {
    return NextResponse.json({ ok: false, error: { message: "Not authenticated." } }, { status: 401 });
  }

  if (!user) {
    if (isAdminPage && !isLoginPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Signed in: figure out whether this account still needs to set its own password.
  //
  // Page navigations only. Both outcomes below are redirects, and both require
  // isAdminPage - an API route cannot be redirected, so on /api/admin/* and the
  // lead-update route this query was run and its result thrown away, unread, on
  // every single request. Dropping it there removes a ~450ms round trip from
  // every admin API call and changes no behaviour: must_change_password has
  // never gated API access, only which page you land on.
  if (isAdminPage) {
    // Answered once per session instead of once per navigation.
    //
    // This query was the last network call left in the middleware, and it ran
    // on EVERY admin page load — a guaranteed ~120ms added to every sidebar
    // click, to re-answer a question whose answer had not changed since the
    // previous click a second earlier.
    //
    // The cookie holds the user id, not a boolean, so a stale cookie left over
    // from a different account cannot satisfy the check. It grants NOTHING on
    // its own: access is decided entirely by the verified JWT above, and the
    // only thing this skips is a UX redirect to the set-password screen. A
    // forged cookie would need a valid session to be of any use, and even then
    // buys nothing an authenticated user does not already have.
    //
    // The trade-off: if an admin flips must_change_password back to true for an
    // account that is already signed in, the redirect takes up to an hour to
    // start applying. That is a rare administrative action, and the cookie is
    // deliberately short-lived so it self-corrects rather than needing a purge.
    const PW_CHECKED_COOKIE = "cvd_pw_checked";
    const alreadyChecked = request.cookies.get(PW_CHECKED_COOKIE)?.value === user.id;

    let mustChangePassword = false;

    if (!alreadyChecked) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      mustChangePassword = profile?.must_change_password === true;

      // Only cached once the answer is "no". The "yes" case has to keep asking,
      // otherwise setting a password would not take effect until the cookie
      // expired.
      if (!mustChangePassword) {
        response.cookies.set(PW_CHECKED_COOKIE, user.id, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60,
        });
      }
    }

    if (mustChangePassword && !isSetPasswordPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/set-password";
      return NextResponse.redirect(redirectUrl);
    }

    if (!mustChangePassword && isSetPasswordPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/leads/:path*"],
};
