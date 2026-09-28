import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import { verifyOtpCode } from "@/lib/whatsapp/otp-hash";
import { issueOtpProof } from "@/lib/whatsapp/otp-proof";
import { isRateLimited } from "@/lib/rate-limit";
import { logOtpAttempt } from "@/lib/server/otp-log";
import { getClientIp } from "@/lib/server/ip";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getPublicLeadVerificationMode } from "@/lib/server/public-lead-verification";

function err(kind: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { kind, message } }, { status });
}

export async function POST(req: NextRequest) {
  if (getPublicLeadVerificationMode() === "unverified") {
    return err("otp_sending_disabled", "WhatsApp verification is temporarily unavailable.", 503);
  }
  if (!isSupabaseConfigured()) {
    return err("server_error", "Verification is not configured yet.", 503);
  }

  let body: { phone?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return err("validation", "Invalid request.", 400);
  }

  const phone = typeof body.phone === "string" ? normalizeWhatsappPhone(body.phone) : null;
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const ip = getClientIp(req);

  if (!phone) {
    return err("validation", "Missing or invalid phone number.", 400);
  }
  if (!/^\d{6}$/.test(code)) {
    return err("otp_invalid", "Incorrect verification code.", 400);
  }

  if (isRateLimited(`wa-otp-verify:${phone}`, 8, 10 * 60 * 1000)) {
    return err("rate_limited", "Too many attempts. Please try again later.", 429);
  }

  const supabase = getSupabaseAdmin();

  const { data: row } = await supabase
    .from("whatsapp_otp_verifications")
    .select("id, otp_hash, expires_at, attempt_count, max_attempts, verification_session_id, used_at")
    .eq("phone_number", phone)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return err("otp_expired", "Verification code expired.", 400);
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return err("otp_expired", "Verification code expired.", 400);
  }
  if (row.attempt_count >= row.max_attempts) {
    return err("too_many_attempts", "Too many incorrect attempts.", 429);
  }

  const matched = verifyOtpCode(code, row.otp_hash);
  void logOtpAttempt({ phone, ip, action: "verify", success: matched });

  if (!matched) {
    const nextCount = row.attempt_count + 1;
    await supabase.from("whatsapp_otp_verifications").update({ attempt_count: nextCount }).eq("id", row.id);

    if (nextCount >= row.max_attempts) {
      return err("too_many_attempts", "Too many incorrect attempts.", 429);
    }
    return err("otp_invalid", "Incorrect verification code.", 400);
  }

  await supabase
    .from("whatsapp_otp_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);

  const proof = issueOtpProof({ verificationId: row.id, sessionId: row.verification_session_id, phone });

  return NextResponse.json({ ok: true, data: { proof, verifiedPhone: phone } });
}
