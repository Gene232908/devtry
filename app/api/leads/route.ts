import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/components/public/valuation-form/lead.schema";
import { normalizeWhatsappPhone, isAllowedWhatsappRecipient } from "@/lib/whatsapp/phone";
import { readOtpProof } from "@/lib/whatsapp/otp-proof";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { pickNextAssignee } from "@/lib/server/lead-assignment";
import { sendNewLeadNotification } from "@/lib/server/lead-notifications";
import { getPublicLeadVerificationMode } from "@/lib/server/public-lead-verification";
import { getClientIp } from "@/lib/server/ip";
import { isRateLimited } from "@/lib/rate-limit";
import { REOPENABLE_STATUSES } from "@/lib/server/enquiry";

// Flags a lead as duplicate if the same submitted phone appeared within this window.
const DUPLICATE_WINDOW_DAYS = 30;

// Fields other than whatsapp are re-validated with the shared schema; whatsapp
// is handled separately below since it must accept the test-mode WhatsApp
// phone format (PH) as well as UAE, unlike the schema's UAE-only regex.
const restSchema = leadSchema.omit({ whatsapp: true });
const MILES_TO_KM = 1.609344;

function mileageFromBody(body: Record<string, unknown>) {
  const value = typeof body.mileageKm === "number" ? body.mileageKm : Number(body.mileageKm);
  const unit = body.mileageUnit === "miles" ? "miles" : "km";
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) return null;
  return { value, unit, km: unit === "miles" ? Math.round(value * MILES_TO_KM) : value } as const;
}

function err(kind: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { kind, message } }, { status });
}

const RETRY_FIELDS = "id, phone_e164, inquiry_type, full_name, email, make, model, trim, year, mileage_value, mileage_unit, specification, description, option_level, emirate, marketing_consent, scrap_condition, scrap_asking_price_aed";

function sameSubmission(row: Record<string, unknown>, expected: Record<string, unknown>) {
  return Object.entries(expected).every(([key, value]) => row[key] === value);
}

export async function POST(req: NextRequest) {
  const verificationMode = getPublicLeadVerificationMode();
  if (!isSupabaseConfigured()) {
    return err("server_error", "Database is not configured yet.", 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("validation", "Invalid request.", 400);
  }

  const proofToken = typeof body.proof === "string" ? body.proof : "";
  const submissionId = typeof body.submissionId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionId)
    ? body.submissionId
    : null;
  if (body.inquiryType !== "scrap" && body.inquiryType !== "valuation") {
    return err("validation", "Invalid enquiry type.", 400);
  }
  const inquiryType = body.inquiryType === "scrap" ? "scrap" : "valuation";
  const scrapCondition = typeof body.scrapCondition === "string" ? body.scrapCondition.trim().slice(0, 400) : "";
  const scrapAskingPrice = body.scrapAskingPriceAed === undefined || body.scrapAskingPriceAed === ""
    ? null
    : Number(body.scrapAskingPriceAed);
  const phone = typeof body.whatsapp === "string" ? normalizeWhatsappPhone(body.whatsapp) : null;
  const mileage = mileageFromBody(body);

  if (!phone) {
    return err("validation", "Enter a valid mobile number.", 400);
  }
  if (!isAllowedWhatsappRecipient(phone)) return err("validation", "Enter a valid mobile number.", 400);
  if (!mileage) return err("validation", "Enter whole-number mileage between 0 and 1,000,000.", 400);
  if (inquiryType === "scrap" && (!scrapCondition || !Number.isFinite(scrapAskingPrice) || (scrapAskingPrice ?? 0) < 0)) {
    return err("validation", "Add the vehicle condition and asking price for this scrap inquiry.", 400);
  }

  if (typeof body.honeypot !== "string" || body.honeypot.trim()) return err("validation", "Please try again.", 400);
  if (verificationMode === "unverified" && (!submissionId || proofToken)) {
    return err("validation", "Please refresh the form and try again.", 400);
  }

  const supabase = getSupabaseAdmin();
  const proofPayload = verificationMode === "otp" ? readOtpProof(proofToken, phone) : null;
  if (verificationMode === "otp" && !proofPayload) {
    return err("otp_expired", "Please verify your WhatsApp number before submitting.", 401);
  }

  if (proofPayload) {
  let { data: verification, error: verificationError } = await supabase
    .from("whatsapp_otp_verifications")
    .select("id, phone_number, inquiry_type, verification_session_id, verified_at, used_at, valuation_submission_id")
    .eq("id", proofPayload.verificationId)
    .maybeSingle();

  // A valuation can still finish safely during the short period before
  // migration 0035. Scrap never falls back because its proof must remain bound
  // to Scrap. The already-required 0034 lead migration is still required for
  // any Scrap submission.
  const missingOtpInquiryType = /inquiry_type/i.test(verificationError?.message ?? "");
  if (verificationError && inquiryType === "valuation" && missingOtpInquiryType) {
    ({ data: verification, error: verificationError } = await supabase
      .from("whatsapp_otp_verifications")
      .select("id, phone_number, verification_session_id, verified_at, used_at, valuation_submission_id")
      .eq("id", proofPayload.verificationId)
      .maybeSingle());
  }

  if (verificationError || !verification) {
    return err("otp_expired", "Your verification expired. Please verify your number again.", 401);
  }
  if (verification.phone_number !== phone || verification.verification_session_id !== proofPayload.sessionId) {
    return err("otp_expired", "Your verification expired. Please verify your number again.", 401);
  }
  if (!missingOtpInquiryType && verification.inquiry_type !== inquiryType) {
    return err("otp_expired", "Please verify your number for this enquiry before submitting.", 401);
  }
  if (!verification.verified_at) {
    return err("otp_expired", "Please verify your WhatsApp number before submitting.", 401);
  }

  // Idempotency: if this exact proof already produced a lead (e.g. the client
  // retried after a network error but the server had already succeeded),
  // return the same lead instead of rejecting the proof as "already used".
  if (verification.used_at) {
    if (verification.valuation_submission_id) {
      return NextResponse.json({ ok: true, data: { id: verification.valuation_submission_id } });
    }
    return err("otp_expired", "Your verification expired. Please verify your number again.", 401);
  }
  }

  // Re-validate all other fields server-side (never trust the client).
  const parsed = restSchema.safeParse({
    make: body.make,
    model: body.model,
    year: body.year,
    mileageKm: body.mileageKm,
    mileageUnit: body.mileageUnit ?? "km",
    specification: body.specification,
    description: body.description ?? "",
    trim: typeof body.trim === "string" ? body.trim : "",
    optionLevel: body.optionLevel,
    location: body.location,
    fullName: body.fullName,
    email: body.email ?? "",
    consent: body.consent,
  });

  if (!parsed.success) {
    return err("validation", "Please check your details and try again.", 400);
  }

  const v = parsed.data;
  const expectedSubmission = {
    phone_e164: phone,
    inquiry_type: inquiryType,
    full_name: v.fullName,
    email: v.email || null,
    make: v.make,
    model: v.model,
    trim: v.trim || null,
    year: Number(v.year),
    mileage_value: mileage.value,
    mileage_unit: mileage.unit,
    specification: v.specification,
    description: v.description || null,
    option_level: v.optionLevel,
    emirate: v.location,
    marketing_consent: true,
    scrap_condition: inquiryType === "scrap" ? scrapCondition : null,
    scrap_asking_price_aed: inquiryType === "scrap" ? scrapAskingPrice : null,
  };

  if (verificationMode === "unverified" && submissionId) {
    // The existing UUID primary key gives atomic retry idempotency without a
    // migration. A repeat must match the submitted identity and vehicle.
    const { data: existing, error: existingError } = await supabase
      .from("leads")
      .select(RETRY_FIELDS)
      .eq("id", submissionId)
      .maybeSingle();
    if (existingError) return err("server_error", "Please try again later.", 503);
    if (existing) {
      if (sameSubmission(existing, expectedSubmission)) {
        return NextResponse.json({ ok: true, data: { id: existing.id } });
      }
      return err("validation", "Please refresh the form and try again.", 409);
    }

    const ip = getClientIp(req);
    if (isRateLimited(`public-lead-phone:${phone}`, 5, 60 * 60 * 1000) ||
        (ip && isRateLimited(`public-lead-ip:${ip}`, 20, 60 * 60 * 1000))) {
      return err("rate_limited", "Too many requests. Please try again later.", 429);
    }

    // Unlike the OTP send gate, failed blocklist/open-lead lookups must stop a
    // direct submission; there is no verified phone proof to fall back on.
    const { data: blocked, error: blockedError } = await supabase
      .from("blocked_numbers").select("phone_e164").eq("phone_e164", phone).maybeSingle();
    if (blockedError) return err("server_error", "Please try again later.", 503);
    if (blocked) return err("rate_limited", "Unable to accept this request.", 429);

    const { data: latestLead, error: leadLookupError } = await supabase
      .from("leads").select("status").eq("phone_e164", phone).eq("inquiry_type", inquiryType)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (leadLookupError) return err("server_error", "Please try again later.", 503);
    if (latestLead && !REOPENABLE_STATUSES.has(latestLead.status as string)) {
      return err("already_submitted", "Your information has already been received. Our team will contact you.", 409);
    }
  }

  // Specification is configured by Super Admin in Vehicle Catalog. Validate
  // it on the server too, so a crafted public request cannot store a made-up
  // option that staff will not be able to filter or report on consistently.
  const FALLBACK_SPECIFICATION_NAMES = new Set(["GCC Specs", "American Specs", "Japanese Specs", "European Specs"]);
  const { data: catalogSpecification, error: catalogSpecificationError } = await supabase
    .from("vehicle_specifications")
    .select("id")
    .eq("name", v.specification)
    .maybeSingle();

  const isValidSpec = catalogSpecification || FALLBACK_SPECIFICATION_NAMES.has(v.specification);
  if (!isValidSpec) {
    if (catalogSpecificationError) {
      return err("server_error", "Vehicle Catalog is temporarily unavailable. Please try again.", 503);
    }
    return err("validation", "Select a valid vehicle specification.", 400);
  }

  // Duplicate detection: same verified phone within the window.
  let isDuplicate = false;
  try {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("phone_e164", phone)
      .gte("created_at", since);
    isDuplicate = (count ?? 0) > 0;
  } catch {
    // non-fatal; default isDuplicate = false
  }

  // Round-robin the lead onto a Call Centre agent at creation, so it arrives
  // already owned by exactly one person. Purchasers are deliberately NOT
  // assigned here — a lead only reaches a purchaser once an agent schedules the
  // inspection (see PATCH /api/leads/[id]).
  const callCenterId = await pickNextAssignee("call_center");

  const insertRow = {
    ...(verificationMode === "unverified" ? { id: submissionId } : {}),
    full_name: v.fullName,
    phone_e164: phone,
    phone_verified: verificationMode === "otp",
    email: v.email && v.email.length > 0 ? v.email : null,
    make: v.make,
    model: v.model,
    trim: v.trim || null,
    year: Number(v.year),
    mileage_km: mileage.km,
    mileage_value: mileage.value,
    mileage_unit: mileage.unit,
    specification: v.specification,
    description: v.description && v.description.length > 0 ? v.description : null,
    option_level: v.optionLevel,
    emirate: v.location,
    status: "new" as const,
    source: "web",
    inquiry_type: inquiryType,
    scrap_condition: inquiryType === "scrap" ? scrapCondition : null,
    scrap_asking_price_aed: inquiryType === "scrap" ? scrapAskingPrice : null,
    marketing_consent: v.consent === true,
    consent_at: v.consent === true ? new Date().toISOString() : null,
    is_duplicate: isDuplicate,
    call_center_id: callCenterId,
  };

  const { data, error } = await supabase.from("leads").insert(insertRow).select("id, created_at").single();

  if (error || !data) {
    if (verificationMode === "unverified" && error?.code === "23505") {
      const { data: existing } = await supabase.from("leads").select(RETRY_FIELDS).eq("id", submissionId).maybeSingle();
      if (existing && sameSubmission(existing, expectedSubmission)) {
        return NextResponse.json({ ok: true, data: { id: existing.id } });
      }
      return err("already_submitted", "Your request was already received. Please contact our team if needed.", 409);
    }
    return err("server_error", "Couldn't submit your details. Please try again.", 500);
  }

  // Consume the proof — bind it to this lead so it can never be reused for a
  // different submission, while still allowing an idempotent retry above.
  if (proofPayload) await supabase
    .from("whatsapp_otp_verifications")
    .update({ used_at: new Date().toISOString(), valuation_submission_id: data.id })
    .eq("id", proofPayload.verificationId);

  // This person finished the form, so any half-finished capture for the same
  // number must stop showing as incomplete. Marking (rather than deleting) is
  // what makes the guarantee hold under a race: capture_partial_lead refuses to
  // update a converted row, so a capture request still in flight when this runs
  // cannot put them back on the incomplete list.
  try {
    await supabase.rpc("mark_partial_lead_converted", { p_phone: phone, p_lead_id: data.id, p_inquiry_type: inquiryType });
  } catch {
    // non-fatal — the lead itself is already saved
  }

  // Activity timeline entry (best-effort).
  try {
    await supabase.from("lead_events").insert({
      lead_id: data.id,
      type: "lead_created",
      meta: { source: "web", inquiry_type: inquiryType, is_duplicate: isDuplicate, verification_method: verificationMode },
    });
  } catch {
    // non-fatal
  }

  // The recipient is read from Settings for every submission, rather than from
  // an environment variable or hard-coded address. An owner can therefore save
  // a new Notify email and the very next lead goes to the new destination.
  // Email is deliberately after the database write: an SMTP outage must never
  // make a real customer think their valuation request was lost.
  try {
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("notify_email")
      .eq("id", 1)
      .maybeSingle();
    const recipient = typeof settings?.notify_email === "string" ? settings.notify_email.trim() : "";

    if (!settingsError && recipient) {
      await sendNewLeadNotification(recipient, {
        id: data.id,
        fullName: v.fullName,
        phoneE164: phone,
        email: v.email && v.email.length > 0 ? v.email : null,
        make: v.make,
        model: v.model,
        trim: v.trim || null,
        year: Number(v.year),
        mileageKm: mileage.km,
        mileageValue: mileage.value,
        mileageUnit: mileage.unit,
        emirate: v.location,
        createdAt: data.created_at,
      });
    }
  } catch (notificationError) {
    // Do not expose mail provider details or customer data to the public form.
    // The lead is already stored; this server-side log makes delivery failures
    // observable without converting them into lost customer submissions.
    console.error("[POST /api/leads] New-lead notification failed:", notificationError instanceof Error ? notificationError.message : "unknown error");
  }

  return NextResponse.json({ ok: true, data: { id: data.id } });
}
