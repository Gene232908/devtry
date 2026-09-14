import { NextRequest, NextResponse } from "next/server";
import { manualLeadSchema } from "@/lib/admin/manual-lead-schema";
import { hasCapability } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/server/require-staff";
import { pickNextAssignee } from "@/lib/server/lead-assignment";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";

const DUPLICATE_WINDOW_DAYS = 30;
const MAX_PROOF_BYTES = 8 * 1024 * 1024;
const PROOF_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

function error(message: string, status: number, fields?: Record<string, string[] | undefined>) {
  return NextResponse.json({ ok: false, error: { message, fields } }, { status });
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return error(auth.message, auth.status);
  if (!hasCapability(auth.identity, "createLeads")) return error("You do not have permission to create leads.", 403);
  if (!isSupabaseConfigured()) return error("Database is not configured.", 503);

  let input: unknown;
  let proofFile: File | null = null;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const raw = form.get("data");
      input = typeof raw === "string" ? JSON.parse(raw) : null;
      const candidate = form.get("proof");
      proofFile = candidate instanceof File ? candidate : null;
    } else {
      input = await request.json();
    }
  } catch {
    return error("Invalid request.", 400);
  }

  const parsed = manualLeadSchema.safeParse(input);
  if (!parsed.success) {
    return error("Please check the highlighted fields.", 400, parsed.error.flatten().fieldErrors);
  }

  const value = parsed.data;
  if (value.referralType !== "none") {
    if (!proofFile || proofFile.size === 0) return error("Upload a screenshot, chat image, or PDF as referral proof.", 400, { proof: ["Upload referral proof"] });
    if (proofFile.size > MAX_PROOF_BYTES || !PROOF_TYPES.has(proofFile.type)) {
      return error("Use a JPG, PNG, or PDF proof up to 8 MB.", 400, { proof: ["Use a JPG, PNG, or PDF up to 8 MB"] });
    }
  }
  const phone = normalizeWhatsappPhone(value.phone);
  if (!phone) return error("Enter a valid mobile number.", 400, { phone: ["Enter a valid mobile number"] });

  const supabase = getSupabaseAdmin();
  // Resolve each level by its parent ID instead of filtering a deeply nested
  // PostgREST relation. This exactly mirrors the public catalog endpoint and
  // avoids a valid selected path being rejected due to nested-filter behavior.
  const { data: catalogMake, error: makeError } = await supabase
    .from("car_makes")
    .select("id")
    .eq("name", value.make)
    .maybeSingle();
  const { data: catalogModel, error: modelError } = catalogMake
    ? await supabase
        .from("car_models")
        .select("id")
        .eq("make_id", catalogMake.id)
        .eq("name", value.model)
        .maybeSingle()
    : { data: null, error: null };
  const [{ data: catalogTrim, error: trimError }, { data: catalogSpecification, error: specificationError }] = await Promise.all([
    catalogModel
      ? supabase
          .from("car_trims")
          .select("id")
          .eq("model_id", catalogModel.id)
          .eq("name", value.trim)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("vehicle_specifications").select("id").eq("name", value.specification).maybeSingle(),
  ]);
  if (makeError || modelError || trimError) {
    return error("Vehicle Catalog is unavailable. Refresh the page and try again.", 503);
  }
  if (!catalogTrim) {
    return error("Select a valid make, model, and trim from the Vehicle Catalog.", 400);
  }
  if (specificationError) return error("Vehicle specifications are unavailable. Refresh the page and try again.", 503);
  if (!catalogSpecification) {
    return error("Select a valid vehicle specification.", 400, { specification: ["Select a valid specification"] });
  }

  if (value.referralType === "employee") {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, is_active")
      .eq("id", value.referrerStaffId)
      .maybeSingle();
    if (!referrer || referrer.is_active === false) {
      return error("Choose an active employee as the referrer.", 400, { referrerStaffId: ["Choose an active employee"] });
    }
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 86_400_000).toISOString();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("phone_e164", phone)
    .gte("created_at", since);
  const isDuplicate = (count ?? 0) > 0;

  const source = `manual_${value.source}`;
  const inspectionScheduledAt = value.inspectionScheduledAt
    ? new Date(value.inspectionScheduledAt).toISOString()
    : null;
  const callCenterId = auth.identity.role === "call_center"
    ? auth.identity.userId
    : await pickNextAssignee("call_center");
  const purchaserId = inspectionScheduledAt ? await pickNextAssignee("purchaser") : null;
  let proofPath: string | null = null;
  if (proofFile) {
    const extension = proofFile.type === "application/pdf" ? "pdf" : proofFile.type === "image/png" ? "png" : "jpg";
    proofPath = `pending/${crypto.randomUUID()}.${extension}`;
    const { error: proofUploadError } = await supabase.storage.from("referral-proofs").upload(proofPath, await proofFile.arrayBuffer(), {
      contentType: proofFile.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (proofUploadError) return error("Couldn't upload the referral proof. Please try again.", 500);
  }

  const { data, error: insertError } = await supabase
    .from("leads")
    .insert({
      full_name: value.fullName,
      phone_e164: phone,
      phone_verified: false,
      email: null,
      make: value.make,
      model: value.model,
      trim: value.trim,
      year: value.year,
      mileage_km: value.mileageKm,
      specification: value.specification,
      option_level: value.optionLevel,
      emirate: value.emirate,
      status: inspectionScheduledAt ? "inspection_scheduled" : "new",
      inspection_scheduled_at: inspectionScheduledAt,
      source,
      description: null,
      notes: value.notes || null,
      marketing_consent: false,
      is_duplicate: isDuplicate,
      call_center_id: callCenterId,
      purchaser_id: purchaserId,
      created_by: auth.identity.userId,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    if (proofPath) await supabase.storage.from("referral-proofs").remove([proofPath]);
    const migrationMissing = /created_by/i.test(insertError?.message ?? "");
    return error(
      migrationMissing
        ? "Manual lead setup is incomplete. Apply the latest database migration first."
        : "Couldn't create the lead. Please try again.",
      500,
    );
  }

  if (value.referralType !== "none" && proofFile && proofPath) {
    const { error: referralError } = await supabase.from("lead_referrals").insert({
      lead_id: data.id,
      referrer_type: value.referralType,
      referrer_staff_id: value.referralType === "employee" ? value.referrerStaffId : null,
      referrer_client_name: value.referralType === "client" ? value.referrerClientName : null,
      proof_note: value.referralProofNote,
      proof_storage_path: proofPath,
      proof_content_type: proofFile.type,
      proof_size_bytes: proofFile.size,
      created_by: auth.identity.userId,
    });
    if (referralError) {
      await Promise.all([
        supabase.from("leads").delete().eq("id", data.id),
        supabase.storage.from("referral-proofs").remove([proofPath]),
      ]);
      const migrationMissing = /lead_referrals|referral/i.test(referralError.message ?? "");
      return error(migrationMissing ? "Referral setup is incomplete. Apply the latest database migration first." : "Couldn't save the referral. Please try again.", 500);
    }
  }

  await supabase.from("lead_events").insert({
    lead_id: data.id,
    actor: auth.identity.userId,
    type: "lead_created",
    meta: {
      source,
      source_note: value.sourceNote || null,
      created_by_role: auth.identity.role,
      is_duplicate: isDuplicate,
      assigned_call_center_id: callCenterId,
      assigned_purchaser_id: purchaserId,
      referral_type: value.referralType === "none" ? null : value.referralType,
      referrer_staff_id: value.referralType === "employee" ? value.referrerStaffId : null,
      referrer_client_name: value.referralType === "client" ? value.referrerClientName : null,
      inspection_scheduled_at: inspectionScheduledAt,
    },
  });

  return NextResponse.json({
    ok: true,
    data: { id: data.id, isDuplicate, assignedToCallCenter: Boolean(callCenterId) },
  });
}
