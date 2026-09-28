export type PublicLeadVerificationMode = "otp" | "unverified";

/** Server-owned switch shared by the public form and both OTP endpoints. */
export function getPublicLeadVerificationMode(): PublicLeadVerificationMode {
  const configured = process.env.PUBLIC_LEAD_VERIFICATION_MODE?.trim().toLowerCase();
  if (!configured || configured === "unverified") return "unverified";
  if (configured === "otp") return "otp";
  throw new Error("Invalid PUBLIC_LEAD_VERIFICATION_MODE");
}
