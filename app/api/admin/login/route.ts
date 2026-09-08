import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/server/ip";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  hashLoginIp,
  purgeOldLoginAttempts,
} from "@/lib/server/login-rate-limit";

export const dynamic = "force-dynamic";

// The ONLY way into the admin. The login page used to call
// supabase.auth.signInWithPassword() straight from the browser, which meant no
// server code ran and nothing could refuse an attempt — eight wrong passwords
// in a row were all processed. Sign-in happens here now so the throttle in
// lib/server/login-rate-limit.ts sits in front of the credential check.
//
// Note this route is NOT under the middleware's auth gate: /api/admin/login is
// matched by `/api/admin/:path*`, so middleware runs, but it only rejects
// unauthenticated requests — which is every request to a login endpoint. See
// middleware.ts, where this path is explicitly allowed through.

/**
 * One message for every failure. A different response for "no such account"
 * versus "wrong password" would let anyone confirm which addresses have admin
 * accounts, so both say exactly this.
 */
const GENERIC_FAILURE = "Incorrect email or password.";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: { message: GENERIC_FAILURE } }, { status: 400 });
  }

  const ipHash = hashLoginIp(getClientIp(req));
  const service = getSupabaseAdmin();

  // Decided BEFORE the password is checked, so a refused attempt costs an
  // attacker a request and tells them nothing.
  const limit = await checkLoginRateLimit(service, email, ipHash);
  if (!limit.allowed) {
    if (limit.reason) console.warn(`[login] refused: ${limit.reason}`);
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "rate_limited",
          message: `Too many sign-in attempts. Try again in ${formatWait(limit.retryAfterSecs)}.`,
          retryAfterSecs: limit.retryAfterSecs,
        },
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSecs) } },
    );
  }

  // The session cookies are written onto this response as the client signs in,
  // so the browser is authenticated exactly as it was before — the difference
  // is only that the exchange now happens here rather than in the page.
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

  if (error) {
    // The failed attempt is already recorded by the RPC above, which is what
    // makes the next one count against the limit.
    return NextResponse.json({ ok: false, error: { message: GENERIC_FAILURE } }, { status: 401 });
  }

  // Verify account is active
  const { data: authData } = await supabase.auth.getUser();
  if (authData?.user) {
    const { data: profile } = await service
      .from("profiles")
      .select("is_active")
      .eq("id", authData.user.id)
      .single();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { ok: false, error: { message: "Your account has been disabled by the owner." } },
        { status: 403 },
      );
    }
  }

  // Proving the password clears this account's failures, so an owner who
  // mistyped twice does not carry those into the rest of the window.
  await clearLoginAttempts(service, email, ipHash);
  // Opportunistic housekeeping — cheap, and keeps the table from growing.
  void purgeOldLoginAttempts(service);

  return response;
}

/** "3 minutes" / "45 seconds" — a duration someone can act on. */
function formatWait(secs: number): string {
  if (secs < 60) return `${secs} second${secs === 1 ? "" : "s"}`;
  const mins = Math.ceil(secs / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}
