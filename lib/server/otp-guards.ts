import type { SupabaseClient } from "@supabase/supabase-js";

// Server-only: persistent, DB-backed abuse guards for the WhatsApp OTP send
// endpoint.
//
// Why these exist separately from lib/rate-limit.ts: that limiter keeps its
// counters in Node process memory, so on Vercel they reset on every cold start
// and are not shared between concurrent instances. That is fine as best-effort
// defence in depth, but it cannot put a ceiling on spend — and with the Meta
// Cloud API every delivered OTP is billed, so an unbounded send loop bills the
// business directly. Meta exposes no hard spend cap for messaging (only a
// billing threshold, which controls when the card is charged, not how much),
// so the ceiling has to live here.
//
// Source of truth is whatsapp_otp_verifications, not otp_attempts: exactly one
// row is inserted there per send attempt, awaited, before the message is sent.
// otp_attempts is written fire-and-forget (see lib/server/otp-log.ts) and so
// can lag behind a burst.

const WINDOW_MS = 24 * 60 * 60 * 1000;

const OTP_TABLE = "whatsapp_otp_verifications";

/** Reads a positive integer env override, falling back when unset or malformed. */
function capFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type OtpCaps = {
  global: number;
  phone: number;
  ip: number;
  unverified: number;
};

/**
 * The caps in force, read from the same env overrides the guards use.
 *
 * Exported so the Blocked Numbers screen can report "4 of 5 sends used" against
 * the real ceiling rather than a hard-coded guess that drifts the moment an
 * override is set.
 */
export function getOtpCaps(): OtpCaps {
  return {
    global: capFromEnv("OTP_GLOBAL_DAILY_CAP", 300),
    phone: capFromEnv("OTP_PHONE_DAILY_CAP", 5),
    ip: capFromEnv("OTP_IP_DAILY_CAP", 10),
    unverified: capFromEnv("OTP_UNVERIFIED_STREAK_CAP", 3),
  };
}

/** The window every guard measures over. */
export const OTP_GUARD_WINDOW_MS = WINDOW_MS;

export type OtpGuardDenial = {
  /**
   * Deliberately distinct from "rate_limited" (the 60-second resend cooldown).
   * Every guard here blocks for a rolling 24 hours, and the client copy for the
   * two cases has to differ — "please wait" reads as seconds and would leave a
   * blocked customer retrying a message that will not change for a day.
   */
  kind: "daily_limit";
  /** Server-side only — for logs. Never surfaced to the caller. */
  reason: string;
};

/**
 * Counts rows in the trailing 24h window, optionally narrowed by a column.
 * Returns null when the count could not be determined.
 */
async function countRecent(
  supabase: SupabaseClient,
  since: string,
  narrow?: { column: string; value: string },
  onlyUnverified = false,
): Promise<number | null> {
  let query = supabase
    .from(OTP_TABLE)
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (narrow) query = query.eq(narrow.column, narrow.value);
  if (onlyUnverified) query = query.is("verified_at", null);

  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

/**
 * Decides whether another OTP may be sent. Returns null to allow, or a denial
 * to block. Call this BEFORE inserting the verification row and before sending.
 *
 * Fails open: if Supabase cannot be queried, sending proceeds rather than
 * breaking the form for real customers. The 60-second per-phone resend
 * cooldown enforced in the route still applies in that case.
 */
export async function checkOtpSendGuards(
  supabase: SupabaseClient,
  phone: string,
  ipHash: string | null,
): Promise<OtpGuardDenial | null> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const globalCap = capFromEnv("OTP_GLOBAL_DAILY_CAP", 300);
  const phoneCap = capFromEnv("OTP_PHONE_DAILY_CAP", 5);
  const ipCap = capFromEnv("OTP_IP_DAILY_CAP", 10);
  const unverifiedCap = capFromEnv("OTP_UNVERIFIED_STREAK_CAP", 3);

  // Layer 2 — global spend circuit breaker. Deliberately checked first: it is
  // the one bound that holds no matter how the attacker distributes traffic
  // across phone numbers and IPs.
  const globalCount = await countRecent(supabase, since);
  if (globalCount !== null && globalCount >= globalCap) {
    return { kind: "daily_limit", reason: `global 24h cap reached (${globalCount}/${globalCap})` };
  }

  // Layer 1a — per phone number.
  const phoneCount = await countRecent(supabase, since, { column: "phone_number", value: phone });
  if (phoneCount !== null && phoneCount >= phoneCap) {
    return { kind: "daily_limit", reason: `phone 24h cap reached (${phoneCount}/${phoneCap})` };
  }

  // Layer 1b — per client IP. Skipped when the IP is unknown, since every such
  // request would otherwise share a single bucket and throttle each other.
  if (ipHash) {
    const ipCount = await countRecent(supabase, since, { column: "request_ip_hash", value: ipHash });
    if (ipCount !== null && ipCount >= ipCap) {
      return { kind: "daily_limit", reason: `ip 24h cap reached (${ipCount}/${ipCap})` };
    }
  }

  // Layer 3 — unverified streak. A spammer pointing codes at someone else's
  // number can never enter one, so a run of sends with no verification at all
  // is the clearest abuse signal available. A caller who has verified even once
  // in the window is exempt, so a real customer whose first code expired is
  // never caught by this.
  const unverifiedCount = await countRecent(supabase, since, { column: "phone_number", value: phone }, true);
  if (unverifiedCount !== null && unverifiedCount >= unverifiedCap) {
    const totalForPhone = phoneCount ?? 0;
    const verifiedCount = totalForPhone - unverifiedCount;
    if (verifiedCount <= 0) {
      return {
        kind: "daily_limit",
        reason: `unverified streak (${unverifiedCount}/${unverifiedCap}, no successful verification in window)`,
      };
    }
  }

  return null;
}
