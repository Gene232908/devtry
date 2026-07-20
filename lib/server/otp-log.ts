import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

type OtpAttempt = {
  phone: string;
  ip: string | null;
  action: "send" | "verify";
  success: boolean;
};

/**
 * Records an OTP attempt for audit / rate-limit history. Non-blocking and
 * best-effort: failures (or an unconfigured Supabase) never break the OTP flow.
 */
export async function logOtpAttempt(attempt: OtpAttempt): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await getSupabaseAdmin().from("otp_attempts").insert({
      phone_e164: attempt.phone,
      ip: attempt.ip,
      action: attempt.action,
      success: attempt.success,
    });
  } catch {
    // swallow — logging must never block the user
  }
}
