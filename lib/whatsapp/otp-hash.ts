import crypto from "crypto";

// Server-only: hashes/verifies OTP codes and client IPs. The plain code is
// never stored — only this HMAC-SHA256 hash — so a database read alone can
// never reveal a usable code.

function getSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is not configured.");
  return secret;
}

export function hashOtpCode(code: string): string {
  return crypto.createHmac("sha256", getSecret()).update(code).digest("hex");
}

/** Constant-time comparison to avoid timing side channels. */
export function verifyOtpCode(code: string, hash: string): boolean {
  const expected = hashOtpCode(code);
  const a = Buffer.from(expected);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Generates a cryptographically secure 6-digit numeric code (000000-999999). */
export function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

/** One-way hash of a client IP for storage — never persist the raw IP. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}
