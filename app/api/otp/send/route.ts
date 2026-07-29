import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsappPhone, isAllowedWhatsappRecipient } from "@/lib/whatsapp/phone";
import { sendWhatsappOtp, WhatsappError } from "@/lib/whatsapp/send-otp";
import { generateOtpCode, hashOtpCode, hashIp } from "@/lib/whatsapp/otp-hash";
import { isRateLimited } from "@/lib/rate-limit";
import { logOtpAttempt } from "@/lib/server/otp-log";
import { checkOtpSendGuards } from "@/lib/server/otp-guards";
import { getClientIp } from "@/lib/server/ip";
import { isDevOtpBypass, DEV_OTP_CODE } from "@/lib/otp-dev";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;

function err(kind: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { kind, message } }, { status });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return err("server_error", "Verification is not configured yet.", 503);
  }

  let body: { phone?: unknown; honeypot?: unknown; startedAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return err("validation", "Invalid request.", 400);
  }

  // Honeypot: a real visitor never fills this hidden field.
  if (typeof body.honeypot === "string" && body.honeypot.trim().length > 0) {
    return err("validation", "Please try again.", 400);
  }

  // Minimum time-on-form guard against instant bot submissions.
  if (typeof body.startedAt === "number" && Date.now() - body.startedAt < 1500) {
    return err("validation", "Please try again.", 400);
  }

  const phone = typeof body.phone === "string" ? normalizeWhatsappPhone(body.phone) : null;
  if (!phone) {
    return err("validation", "Enter a valid mobile number.", 400);
  }

  if (!isAllowedWhatsappRecipient(phone)) {
    return err("not_allowed", "Unable to send the code. Please try again.", 400);
  }

  const ip = getClientIp(req);

  if (isRateLimited(`wa-otp-send:${phone}`, 5, 60 * 60 * 1000)) {
    return err("rate_limited", "Too many attempts. Please try again later.", 429);
  }
  if (ip && isRateLimited(`wa-otp-send-ip:${ip}`, 20, 60 * 60 * 1000)) {
    return err("rate_limited", "Too many attempts. Please try again later.", 429);
  }

  const supabase = getSupabaseAdmin();

  // Hard blocklist, checked before anything else touches Meta. A number an
  // admin marked as spam costs nothing from here on: no message is sent, so no
  // message is billed. Fails open — a database hiccup must not stop real
  // customers from verifying.
  try {
    const { data: blocked } = await supabase
      .from("blocked_numbers")
      .select("phone_e164")
      .eq("phone_e164", phone)
      .maybeSingle();

    if (blocked) {
      // Same copy as the daily-limit case on purpose: a blocked sender learns
      // nothing about why, and a wrongly-blocked customer still gets a route in.
      void logOtpAttempt({ phone, ip, action: "send", success: false });
      return err("daily_limit", "Too many verification requests. Our team will contact you shortly.", 429);
    }
  } catch {
    // non-fatal
  }

  // 60-second resend cooldown, enforced server-side against the last send for this phone.
  const { data: lastRow } = await supabase
    .from("whatsapp_otp_verifications")
    .select("last_sent_at")
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRow) {
    const elapsedSec = (Date.now() - new Date(lastRow.last_sent_at).getTime()) / 1000;
    if (elapsedSec < RESEND_COOLDOWN_SEC) {
      return err(
        "resend_cooldown",
        "Please wait before requesting another code.",
        429,
      );
    }
  }

  // DEV ONLY: use the fixed code and skip the real WhatsApp send, so the full
  // DB-backed verify flow (hash check, attempt limits) is still exercised
  // locally without needing a real message delivered.
  const devBypass = isDevOtpBypass();
  const code = devBypass ? DEV_OTP_CODE : generateOtpCode();

  // Persistent abuse/spend guards. Skipped under the dev bypass, where nothing
  // is actually sent and so nothing is billed. Checked after the cooldown but
  // before the insert, so a denied request leaves no row behind and cannot
  // inflate its own counters.
  if (!devBypass) {
    const denial = await checkOtpSendGuards(supabase, phone, hashIp(ip));
    if (denial) {
      console.warn(`[otp/send] blocked: ${denial.reason}`);
      void logOtpAttempt({ phone, ip, action: "send", success: false });
      return err(denial.kind, "Too many verification requests. Our team will contact you shortly.", 429);
    }
  }

  // Invalidate older, not-yet-verified codes for this phone so only the
  // newest one can succeed.
  await supabase
    .from("whatsapp_otp_verifications")
    .update({ used_at: new Date().toISOString() })
    .eq("phone_number", phone)
    .is("verified_at", null)
    .is("used_at", null);

  const { data: inserted, error: insertError } = await supabase
    .from("whatsapp_otp_verifications")
    .insert({
      phone_number: phone,
      otp_hash: hashOtpCode(code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      max_attempts: MAX_ATTEMPTS,
      request_ip_hash: hashIp(ip),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return err("server_error", "Unable to send the code. Please try again.", 500);
  }

  if (!devBypass) {
    try {
      await sendWhatsappOtp(phone, code);
    } catch (e) {
      void logOtpAttempt({ phone, ip, action: "send", success: false });
      const waError = e instanceof WhatsappError ? e : new WhatsappError("otp_send_failed", "Unable to send the code. Please try again.");
      const status = waError.kind === "rate_limited" ? 429 : 400;
      return err(waError.kind, "Unable to send the code. Please try again.", status);
    }
  }

  void logOtpAttempt({ phone, ip, action: "send", success: true });

  return NextResponse.json({
    ok: true,
    data: { sent: true, resendInSec: RESEND_COOLDOWN_SEC, devBypass },
  });
}
