import crypto from "crypto";

// Short-lived, HMAC-signed proof that a phone number just passed WhatsApp OTP
// verification. Unlike the old stateless Twilio-based verify token, this one
// is bound to a specific Supabase verification row (verificationId) so the
// final /api/leads submission can look the row up, confirm it hasn't already
// been used, and consume it — preventing replay across multiple submissions.

const TTL_MS = 10 * 60 * 1000; // generous window to fill out the rest of the form

type ProofPayload = {
  verificationId: string;
  sessionId: string;
  phone: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is not configured.");
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

/** Issues a verification proof bound to a specific OTP row, session, and phone. */
export function issueOtpProof(params: { verificationId: string; sessionId: string; phone: string }): string {
  const payload: ProofPayload = { ...params, exp: Date.now() + TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/** Validates signature, expiry, and phone match. Does NOT check DB state (used_at) — callers must. */
export function readOtpProof(token: string, phoneE164: string): ProofPayload | null {
  if (typeof token !== "string" || !token.includes(".")) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ProofPayload;
    if (!payload.phone || payload.phone !== phoneE164) return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (!payload.verificationId || !payload.sessionId) return null;
    return payload;
  } catch {
    return null;
  }
}
