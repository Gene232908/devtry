// Temporary developer OTP bypass for LOCAL testing only.
//
// When DEV_OTP_BYPASS=true, the OTP send route skips Twilio (no real SMS) and
// the verify route accepts a fixed DEV_OTP_CODE. This lets us test the full
// lead-save flow without waiting for a real SMS on a verified number.
//
// SAFETY: this is force-disabled whenever NODE_ENV === "production", so even if
// the env var leaks into a production/Vercel deploy it will NOT weaken real OTP.

export const DEV_OTP_CODE = process.env.DEV_OTP_CODE || "123456";

/** True only in non-production when DEV_OTP_BYPASS is explicitly enabled. */
export function isDevOtpBypass(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_OTP_BYPASS === "true";
}
