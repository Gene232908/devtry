import crypto from "crypto";

// Short-lived, HMAC-signed token proving a phone number just passed OTP verification.
// Issued by /api/otp/verify on success and required by /api/leads before insert.
// Stateless (no DB row needed): payload + signature, bound to the phone, 5-min expiry.

const TTL_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret =
    process.env.OTP_VERIFY_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TWILIO_AUTH_TOKEN;
  if (!secret) {
    throw new Error("No signing secret configured for OTP verify tokens.");
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

/** Creates a verify token bound to a phone number, valid for 5 minutes. */
export function issueVerifyToken(phoneE164: string): string {
  const payload = { phone: phoneE164, exp: Date.now() + TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/** Returns true only if the token is valid, unexpired, and matches the phone. */
export function verifyVerifyToken(token: string, phoneE164: string): boolean {
  if (typeof token !== "string" || !token.includes(".")) return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = sign(encoded);
  // Constant-time comparison to avoid timing leaks.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      phone?: string;
      exp?: number;
    };
    if (!payload.phone || payload.phone !== phoneE164) return false;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}
