import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server-only: the sign-in throttle for the admin login.
//
// WHY THIS EXISTS
//   The login page called supabase.auth.signInWithPassword() directly from the
//   browser, so no code of ours ran and nothing could refuse an attempt. Eight
//   wrong passwords submitted back to back were all processed — 0 of 8 refused.
//   Sign-in now goes through /api/admin/login, and this decides, on the server,
//   before any credential is checked.
//
// THE TWO BUCKETS, AND WHY BOTH
//   per (email + IP)  a focused attack on one known account
//   per IP            the same attacker spraying many accounts from one host
//
//   Either alone leaves an obvious hole. Email-only lets an attacker walk
//   through a list of addresses paying the full allowance for each; IP-only,
//   set low enough to stop that, would lock out an office where several staff
//   share one NAT address. Running both, with a tight per-account limit and a
//   looser per-IP ceiling, covers each case with the threshold that suits it.
//
// See supabase/migrations/0019_login_rate_limit.sql for why the counters live
// in Postgres rather than in process memory (short version: Vercel serverless —
// an in-memory Map is neither shared between instances nor survives a cold
// start, so it resets under exactly the load it exists to resist).

/** Failed attempts allowed per (account, IP) pair before refusing. */
const EMAIL_IP_LIMIT = 5;

/**
 * Failed attempts allowed per IP across ALL accounts.
 *
 * Higher than the per-account limit on purpose: several staff behind one office
 * address must not lock each other out by mistyping. It is a ceiling on
 * spraying, not the primary control.
 */
const IP_LIMIT = 20;

/** The rolling window both limits are measured over. */
const WINDOW_SECS = 15 * 60;

export const LOGIN_LIMITS = { emailIp: EMAIL_IP_LIMIT, ip: IP_LIMIT, windowSecs: WINDOW_SECS };

/**
 * Normalises an email to a single canonical form before it is hashed.
 *
 * Without this, "Owner@Example.com " and "owner@example.com" would hash
 * differently and each get a full allowance — an attacker would simply vary the
 * capitalisation to multiply their attempts.
 *
 * Deliberately does NOT strip dots or +tags: that is Gmail-specific behaviour,
 * and applying it universally would merge genuinely different addresses on
 * providers that treat them as distinct.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * One-way hash, so this table can never be read as a list of who tried to sign
 * in from where. Uses the same secret as the OTP hashes; falls back to the
 * service-role key so a missing optional env var cannot silently disable the
 * limiter.
 */
function hashValue(value: string): string {
  const secret = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function hashEmail(email: string): string {
  return hashValue(`login-email:${normaliseEmail(email)}`);
}

export function hashLoginIp(ip: string | null): string | null {
  if (!ip) return null;
  return hashValue(`login-ip:${ip}`);
}

export type LoginLimitDecision = {
  allowed: boolean;
  /** Seconds until a slot frees up. Only meaningful when `allowed` is false. */
  retryAfterSecs: number;
  /** Server-side only, for logs — never surfaced to the caller. */
  reason?: string;
};

type RpcRow = {
  allowed: boolean;
  email_fail_count: number;
  ip_fail_count: number;
  retry_after_secs: number;
};

/**
 * Records this attempt and decides whether it may proceed, in one atomic
 * statement (see the RPC in migration 0019 for why that matters under
 * concurrency).
 *
 * FAILS CLOSED. Every other guard in this codebase fails open, because there
 * the cost of a false refusal is a customer who cannot get a valuation. Here it
 * is inverted: failing open would mean an outage of the counters silently
 * removes all brute-force protection from the admin login, which is precisely
 * when an attacker would want it gone. A signed-in admin locked out for a few
 * minutes by a database blip is the cheaper failure.
 */
export async function checkLoginRateLimit(
  supabase: SupabaseClient,
  email: string,
  ipHash: string | null,
): Promise<LoginLimitDecision> {
  const { data, error } = await supabase.rpc("record_login_attempt", {
    p_email_hash: hashEmail(email),
    p_ip_hash: ipHash,
    p_email_limit: EMAIL_IP_LIMIT,
    p_ip_limit: IP_LIMIT,
    p_window_secs: WINDOW_SECS,
  });

  if (error) {
    return {
      allowed: false,
      retryAfterSecs: 60,
      reason: `rate-limit store unavailable: ${error.message}`,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | undefined;
  if (!row) {
    return { allowed: false, retryAfterSecs: 60, reason: "rate-limit store returned no decision" };
  }

  if (row.allowed) return { allowed: true, retryAfterSecs: 0 };

  return {
    allowed: false,
    retryAfterSecs: Math.max(1, row.retry_after_secs),
    reason: `login limit reached (email+ip ${row.email_fail_count}/${EMAIL_IP_LIMIT}, ip ${row.ip_fail_count}/${IP_LIMIT})`,
  };
}

/**
 * Clears the account's failed-attempt bucket after a verified success, so an
 * owner who mistyped twice before getting it right does not carry those two for
 * the rest of the window.
 *
 * Best-effort: a failure here leaves counters that expire on their own, which
 * is not worth failing a successful sign-in over.
 */
export async function clearLoginAttempts(
  supabase: SupabaseClient,
  email: string,
  ipHash: string | null,
): Promise<void> {
  await supabase
    .rpc("clear_login_attempts", { p_email_hash: hashEmail(email), p_ip_hash: ipHash })
    .then(
      () => undefined,
      () => undefined,
    );
}

/** Housekeeping; called opportunistically so the table cannot grow unbounded. */
export async function purgeOldLoginAttempts(supabase: SupabaseClient): Promise<void> {
  await supabase.rpc("purge_login_attempts").then(
    () => undefined,
    () => undefined,
  );
}
