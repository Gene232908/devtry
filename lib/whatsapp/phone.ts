// Phone validation/normalization for the WhatsApp OTP flow specifically.
// Distinct from components/public/valuation-form/lead.schema.ts's UAE-only
// normalizeUaeMobile, which governs the form's own "WhatsApp number" field —
// this one additionally recognizes Philippine numbers, needed while Meta's
// free test tier can only deliver to a registered PH recipient.
//
// IMPORTANT: normalizeWhatsappPhone() is called from BOTH server code (API
// routes) AND client code (use-valuation-form.ts, a "use client" hook) — so
// it must never read server-only env vars like WHATSAPP_TEST_MODE (those are
// `undefined` in the browser bundle, since only NEXT_PUBLIC_-prefixed vars
// are ever inlined client-side). All test-mode/country gating instead lives
// in isAllowedWhatsappRecipient(), which is only ever called from the
// /api/otp/send route handler (server-only), where the real env vars exist.

const UAE_PATTERNS = [/^05\d{8}$/, /^9715\d{8}$/];
const PH_PATTERNS = [/^09\d{9}$/, /^639\d{9}$/];

function isTestMode(): boolean {
  return process.env.WHATSAPP_TEST_MODE === "true";
}

/** Normalizes a UAE mobile number (05..., 9715..., +9715...) to E.164. */
function normalizeUae(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^05\d{8}$/.test(digits)) return `+971${digits.slice(1)}`;
  if (/^9715\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

/** Normalizes a PH mobile number (09..., 639..., +639...) to E.164. */
function normalizePh(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

/**
 * Normalizes a phone number for the WhatsApp OTP flow to E.164. Recognizes
 * both UAE and PH shapes unconditionally — safe to call from client or
 * server code. Whether a PH number is actually *allowed* to receive an OTP
 * (test mode only) is decided separately by isAllowedWhatsappRecipient.
 */
export function normalizeWhatsappPhone(value: string): string | null {
  return normalizeUae(value) ?? normalizePh(value);
}

function getTestRecipients(): string[] {
  return (process.env.WHATSAPP_TEST_RECIPIENTS ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

/**
 * True if this normalized E.164 number is allowed to receive an OTP right
 * now. SERVER-ONLY — reads WHATSAPP_TEST_MODE / WHATSAPP_TEST_RECIPIENTS.
 *
 * Production (WHATSAPP_TEST_MODE=false): UAE numbers only.
 * Test mode: UAE numbers are always allowed (they're the real audience);
 * PH numbers must be on the WHATSAPP_TEST_RECIPIENTS allow-list — EXCEPT
 * that while the allow-list is left unconfigured, any valid PH number is
 * temporarily allowed through so testing isn't blocked before it's set.
 */
export function isAllowedWhatsappRecipient(normalizedPhone: string): boolean {
  const digits = normalizedPhone.replace(/^\+/, "");
  const isUae = UAE_PATTERNS[1].test(digits); // 9715XXXXXXXX form after stripping +
  const isPh = PH_PATTERNS[1].test(digits); // 639XXXXXXXXX form after stripping +

  if (!isTestMode()) return isUae;

  if (isUae) return true;
  if (isPh) {
    const recipients = getTestRecipients();
    if (recipients.length === 0) return true; // temporary relaxation, see note above
    return recipients.includes(normalizedPhone);
  }
  return false;
}

export { UAE_PATTERNS, PH_PATTERNS, isTestMode };
