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
import { hasOpenLead } from "@/lib/server/enquiry";
import { isWhatsappOtpSendingEnabled } from "@/lib/server/otp-sending";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;

function err(kind: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { kind, message } }, { status });
}

export async function POST(req: NextRequest) {
  // Emergency circuit breaker. It intentionally runs before request parsing,
  // database writes, or the Meta API call, so turning it off immediately stops
  // both OTP charges and new verification records.
  if (!isWhatsappOtpSendingEnabled()) {
    console.warn("[otp/send] WhatsApp OTP sending disabled by emergency switch");
    return err("otp_sending_disabled", "WhatsApp verification is temporarily unavailable. Please try again later.", 503);
  }

  if (!isSupabaseConfigured()) {
    return err("server_error", "Verification is not configured yet.", 503);
  }

  let body: { phone?: unknown; honeypot?: unknown; startedAt?: unknown; inquiryType?: unknown };
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

  if (body.inquiryType !== undefined && body.inquiryType !== "valuation" && body.inquiryType !== "scrap") {
    return err("validation", "Invalid enquiry type.", 400);
  }
  const inquiryType = body.inquiryType === "scrap" ? "scrap" : "valuation";

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
    // A number that has already been through the form is not asked to verify
    // again. Their details are with the business; another code proves nothing
    // and costs a billed WhatsApp message every time they revisit the site.
    //
    // The exception is a lead that has REACHED AN END: 'deal' (the car was
    // bought) and 'closed' (met, not purchased). Those conversations are
    // finished, so the same person selling a second car is a genuinely new
    // enquiry and must be able to verify again.
    //
    // Deliberately a distinct error kind rather than reusing the rate-limit
    // copy: this is not a refusal to be worked around, it is an answer — "we
    // have your details" — and the form says exactly that instead of showing a
    // code box that can never be satisfied.
    // ONLY a real lead counts as "we have your details".
    //
    // A partial_leads row deliberately does NOT, and that is the whole point of
    // this change. That table is temporary storage for someone who typed a name
    // and a number and then stopped: nothing was verified, and often the car was
    // never even chosen. Telling them "your information has been received and
    // management will contact you" was not true, and it trapped them — the form
    // refused to send a code, so the one route they had to FINISH the very form
    // they had started was closed, and their half-record sat in Incomplete Forms
    // for good.
    //
    // A lead is the opposite: it only exists once a code was delivered, entered
    // correctly, and the full form submitted. At that point the message is true.
    if (await hasOpenLead(supabase, phone, inquiryType)) {
      // Deliberately NOT logged as a failed attempt.
      //
      // `otp_attempts` feeds the "Hit a limit" table, which exists to surface
      // abuse. This is the opposite: a customer whose details the business
      // already has, being told so. Logging it put well-behaved people into an
      // abuse list with a Block button next to their name — and since their
      // record is already visible under Incomplete Forms or Leads, the entry
      // added nothing except the suggestion that they had done something wrong.
      return err(
        "already_submitted",
        "Your information has already been received by our management. We will get back to you as soon as possible.",
        409,
      );
    }
  } catch {
    // non-fatal
  }

  // DEV ONLY: use the fixed code and skip the real WhatsApp send, so the full
  // DB-backed verify flow (hash check, attempt limits) is still exercised
  // locally without needing a real message delivered.
  const devBypass = isDevOtpBypass();
  const code = devBypass ? DEV_OTP_CODE : generateOtpCode();

  // Persistent abuse/spend guards, checked BEFORE the resend cooldown.
  //
  // The order matters for what the caller is told. Both return 429, but they
  // mean different things: the cooldown clears in a minute, a daily cap does
  // not clear until tomorrow. Checking the cooldown first meant anyone over a
  // daily cap was told "please wait before requesting another code" — advice
  // that cannot work, since waiting the minute out just produces the same
  // refusal. The longer-lasting limit has to win.
  //
  // Skipped under the dev bypass, where nothing is sent and nothing is billed.
  // Still runs before the insert, so a denied request leaves no row behind and
  // cannot inflate its own counters.
  if (!devBypass) {
    const denial = await checkOtpSendGuards(supabase, phone, hashIp(ip));
    if (denial) {
      console.warn(`[otp/send] blocked: ${denial.reason}`);
      void logOtpAttempt({ phone, ip, action: "send", success: false });
      return err(denial.kind, "Too many verification requests. Our team will contact you shortly.", 429);
    }
  }

  // 60-second resend cooldown, enforced server-side against the last send for
  // this phone. Only reached by callers still within their daily allowance, so
  // "please wait" is now always truthful advice.
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

  // Invalidate older, not-yet-verified codes for this phone so only the
  // newest one can succeed.
  await supabase
    .from("whatsapp_otp_verifications")
    .update({ used_at: new Date().toISOString() })
    .eq("phone_number", phone)
    .is("verified_at", null)
    .is("used_at", null);

  const verificationInsert = {
    phone_number: phone,
    inquiry_type: inquiryType,
    otp_hash: hashOtpCode(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    max_attempts: MAX_ATTEMPTS,
    request_ip_hash: hashIp(ip),
  };
  let { data: inserted, error: insertError } = await supabase
    .from("whatsapp_otp_verifications")
    .insert(verificationInsert)
    .select("id")
    .single();

  // Preserve ordinary valuation OTPs during the brief code-before-migration
  // window. Scrap intentionally has no fallback: losing its type would break
  // its permanent classification and its cross-flow proof protection.
  if (insertError && inquiryType === "valuation" && /inquiry_type/i.test(insertError.message ?? "")) {
    ({ data: inserted, error: insertError } = await supabase
      .from("whatsapp_otp_verifications")
      .insert({
        phone_number: phone,
        otp_hash: verificationInsert.otp_hash,
        expires_at: verificationInsert.expires_at,
        max_attempts: verificationInsert.max_attempts,
        request_ip_hash: verificationInsert.request_ip_hash,
      })
      .select("id")
      .single());
  }

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
