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

  // getUser() (not getSession()) validates the token against Supabase's auth
  // server instead of trusting a possibly-stale cookie - required in middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  if (isAdminPage || isApiAdmin || isApiLeadUpdate) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .single();

    const mustChangePassword = profile?.must_change_password === true;

    if (mustChangePassword && isAdminPage && !isSetPasswordPage) {
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
