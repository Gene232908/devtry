import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/components/public/valuation-form/lead.schema";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import { readOtpProof } from "@/lib/whatsapp/otp-proof";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { pickNextAssignee } from "@/lib/server/lead-assignment";
import { sendNewLeadNotification } from "@/lib/server/lead-notifications";

// Flags a lead as duplicate if the same verified phone submitted within this window.
const DUPLICATE_WINDOW_DAYS = 30;

// Fields other than whatsapp are re-validated with the shared schema; whatsapp
// is handled separately below since it must accept the test-mode WhatsApp
// phone format (PH) as well as UAE, unlike the schema's UAE-only regex.
const restSchema = leadSchema.omit({ whatsapp: true });

function err(kind: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { kind, message } }, { status });
}

export async function POST(req: NextRequest) {
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
  const phone = typeof body.whatsapp === "string" ? normalizeWhatsappPhone(body.whatsapp) : null;

  if (!phone) {
    return err("validation", "Enter a valid mobile number.", 400);
  }

  // The proof must be signed, unexpired, and bound to this exact phone.
  const proofPayload = readOtpProof(proofToken, phone);
  if (!proofPayload) {
    return err("otp_expired", "Please verify your WhatsApp number before submitting.", 401);
  }

  const supabase = getSupabaseAdmin();

  const { data: verification, error: verificationError } = await supabase
    .from("whatsapp_otp_verifications")
    .select("id, phone_number, verification_session_id, verified_at, used_at, valuation_submission_id")
    .eq("id", proofPayload.verificationId)
    .maybeSingle();

  if (verificationError || !verification) {
    return err("otp_expired", "Your verification expired. Please verify your number again.", 401);
  }
  if (verification.phone_number !== phone || verification.verification_session_id !== proofPayload.sessionId) {
    return err("otp_expired", "Your verification expired. Please verify your number again.", 401);
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

  // Re-validate all other fields server-side (never trust the client).
  const parsed = restSchema.safeParse({
    make: body.make,
    model: body.model,
    year: body.year,
    mileageKm: body.mileageKm,
    specification: body.specification,
    description: body.description ?? "",
    trim: body.trim,
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
    full_name: v.fullName,
    phone_e164: phone,
    phone_verified: true,
    email: v.email && v.email.length > 0 ? v.email : null,
    make: v.make,
    model: v.model,
    trim: v.trim,
    year: Number(v.year),
    mileage_km: Number(v.mileageKm),
    specification: v.specification,
    description: v.description && v.description.length > 0 ? v.description : null,
    option_level: v.optionLevel,
    emirate: v.location,
    status: "new" as const,
    source: "web",
    marketing_consent: v.consent === true,
    consent_at: v.consent === true ? new Date().toISOString() : null,
    is_duplicate: isDuplicate,
    call_center_id: callCenterId,
  };

  const { data, error } = await supabase.from("leads").insert(insertRow).select("id, created_at").single();

  if (error || !data) {
    return err("server_error", "Couldn't submit your details. Please try again.", 500);
  }

  // Consume the proof — bind it to this lead so it can never be reused for a
  // different submission, while still allowing an idempotent retry above.
  await supabase
    .from("whatsapp_otp_verifications")
    .update({ used_at: new Date().toISOString(), valuation_submission_id: data.id })
    .eq("id", verification.id);

  // This person finished the form, so any half-finished capture for the same
  // number must stop showing as incomplete. Marking (rather than deleting) is
  // what makes the guarantee hold under a race: capture_partial_lead refuses to
  // update a converted row, so a capture request still in flight when this runs
  // cannot put them back on the incomplete list.
  try {
    await supabase.rpc("mark_partial_lead_converted", { p_phone: phone, p_lead_id: data.id });
  } catch {
    // non-fatal — the lead itself is already saved
  }

  // Activity timeline entry (best-effort).
  try {
    await supabase.from("lead_events").insert({
      lead_id: data.id,
      type: "lead_created",
      meta: { source: "web", is_duplicate: isDuplicate },
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
        mileageKm: Number(v.mileageKm),
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
