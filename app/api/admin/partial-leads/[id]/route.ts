import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PARTIAL_STATUSES_ALLOWED } from "@/lib/admin/partial-lead";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { fetchPartialLead } from "@/lib/admin/queries";
import { hasCapability, type StaffIdentity } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/server/require-staff";
import { pickNextAssignee } from "@/lib/server/lead-assignment";

export const dynamic = "force-dynamic";

// Mirrors the CHECK constraint on partial_leads.status.
const ALLOWED_STATUSES = new Set<string>(PARTIAL_STATUSES_ALLOWED);

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

async function authorizePartialLead(id: string) {
  const auth = await requireStaff();
  if (!auth.ok) return { ok: false as const, response: fail(auth.message, auth.status) };

  // Incomplete forms contain unverified personal contact information. Only the
  // assigned CSR or an owner can access them; Purchasers receive the record
  // only after it becomes a real, inspection-scheduled lead.
  if (!hasCapability(auth.identity, "viewIncompleteForms")) {
    return { ok: false as const, response: fail("Not authorized to access incomplete forms.", 403) };
  }

  const result = await fetchPartialLead(id, auth.identity);
  if (!result.ok) return { ok: false as const, response: fail(result.message, result.status) };

  return { ok: true as const, identity: auth.identity, partial: result.data.partialLead };
}

/** Trimmed string, or null when absent/blank. */
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** Finite positive integer, or null. */
function int(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function mileageFromBody(value: unknown, unit: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1_000_000) return null;
  const mileageUnit = unit === "miles" ? "miles" : "km";
  return {
    value: parsed,
    unit: mileageUnit,
    km: mileageUnit === "miles" ? Math.round(parsed * 1.609344) : parsed,
  } as const;
}

/**
 * Marks an abandoned form as a Deal: converts it to a real lead, then records
 * the purchase. See ADR-004 for why converting is the right answer rather than
 * refusing.
 */
async function convertPartialToLead(
  partialId: string,
  body: Record<string, unknown>,
  target: "inspection_scheduled" | "deal",
  identity: StaffIdentity,
) {
  const notes = str(body.notes);
  if (!notes) return fail("Add a follow-up note before converting this form.", 400);

  const price = Number(body.purchase_price_aed);
  if (target === "deal" && (!Number.isFinite(price) || price <= 0)) {
    return fail("Enter the price the car was actually bought for.", 400);
  }

  const purchasedAt =
    typeof body.purchased_at === "string" && body.purchased_at.trim() !== ""
      ? new Date(body.purchased_at)
      : new Date();
  if (target === "deal" && Number.isNaN(purchasedAt.getTime())) return fail("Invalid purchase date.", 400);

  const inspectionScheduledAt =
    typeof body.inspection_scheduled_at === "string" && body.inspection_scheduled_at.trim() !== ""
      ? new Date(body.inspection_scheduled_at)
      : null;
  if (target === "inspection_scheduled" && (!inspectionScheduledAt || Number.isNaN(inspectionScheduledAt.getTime()))) {
    return fail("Choose a valid inspection date and time.", 400);
  }

  const supabase = getSupabaseAdmin();

  const { data: partial, error: readError } = await supabase
    .from("partial_leads")
    .select("*")
    .eq("id", partialId)
    .maybeSingle();

  if (readError) return fail(readError.message, 500);
  if (!partial) return fail("Incomplete form not found.", 404);
  if (partial.converted_lead_id) {
    return fail("This form has already been converted into a lead.", 409);
  }

  const inquiryType = partial.inquiry_type === "scrap" ? "scrap" : "valuation";
  const scrapCondition = inquiryType === "scrap" ? (str(body.scrap_condition) ?? str(partial.scrap_condition)) : null;
  const rawScrapAskingPrice = inquiryType === "scrap"
    ? (body.scrap_asking_price_aed ?? partial.scrap_asking_price_aed)
    : null;
  const scrapAskingPrice = rawScrapAskingPrice === null || rawScrapAskingPrice === undefined || rawScrapAskingPrice === ""
    ? null
    : Number(rawScrapAskingPrice);
  if (
    inquiryType === "scrap" &&
    (!scrapCondition || scrapCondition.length > 400 || !Number.isFinite(scrapAskingPrice) || (scrapAskingPrice ?? 0) < 0)
  ) {
    return fail("Confirm the Scrap vehicle condition and asking price before scheduling.", 400);
  }

  const fullName = str(body.full_name) ?? str(partial.full_name);
  const make = str(body.make) ?? str(partial.make);
  const model = str(body.model) ?? str(partial.model);
  const year = int(body.year) ?? int(partial.year);
  const specification = str(body.specification) ?? str(partial.specification);
  const emirate = str(body.emirate);
  const suppliedMileage = body.mileage_value === undefined ? null : mileageFromBody(body.mileage_value, body.mileage_unit);
  if (body.mileage_value !== undefined && !suppliedMileage) {
    return fail("Mileage must be a whole number between 0 and 1,000,000.", 400);
  }

  const missing = [
    !fullName && "customer name",
    !make && "make",
    !model && "model",
    !year && "year",
    !specification && "specification",
    !emirate && "inspection emirate",
  ].filter(Boolean);

  if (missing.length > 0) {
    return fail(`Please fill in the ${missing.join(", ")} before creating the lead.`, 400);
  }

  // The browser uses the same dependent dropdowns as the public valuation
  // form, but this route must still reject a crafted request with made-up car
  // data. A scheduled inspection becomes a real lead, so its make/model must
  // exist in the business Vehicle Catalog.
  const { data: catalogMake, error: catalogMakeError } = await supabase
    .from("car_makes")
    .select("id")
    .eq("name", make)
    .maybeSingle();
  if (catalogMakeError) return fail("Vehicle Catalog could not be checked. Please try again.", 503);
  if (!catalogMake) return fail("Select a make from Vehicle Catalog.", 400);

  const { data: catalogModel, error: catalogModelError } = await supabase
    .from("car_models")
    .select("id")
    .eq("make_id", catalogMake.id)
    .eq("name", model)
    .maybeSingle();
  if (catalogModelError) return fail("Vehicle Catalog could not be checked. Please try again.", 503);
  if (!catalogModel) return fail("Select a model for the chosen make.", 400);

  const FALLBACK_SPECIFICATION_NAMES = new Set(["GCC Specs", "American Specs", "Japanese Specs", "European Specs"]);
  const { data: catalogSpecification, error: catalogSpecificationError } = await supabase
    .from("vehicle_specifications")
    .select("id")
    .eq("name", specification)
    .maybeSingle();

  const isValidSpec = catalogSpecification || Boolean(specification && FALLBACK_SPECIFICATION_NAMES.has(specification));
  if (!isValidSpec) {
    if (catalogSpecificationError) return fail("Vehicle Catalog could not be checked. Please try again.", 503);
    return fail("Select a specification from Vehicle Catalog.", 400);
  }

  const callCenterId = partial.call_center_id ?? (identity.role === "call_center" ? identity.userId : null);
  const purchaserId = target === "inspection_scheduled" ? await pickNextAssignee("purchaser") : null;

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      phone_e164: partial.phone_e164,
      make,
      model,
      trim: str(body.trim),
      year,
      mileage_km: suppliedMileage?.km ?? int(partial.mileage_km),
      mileage_value: suppliedMileage?.value ?? int(partial.mileage_value) ?? int(partial.mileage_km),
      mileage_unit: suppliedMileage?.unit ?? (partial.mileage_unit === "miles" ? "miles" : "km"),
      specification,
      emirate,
      description: str(partial.description),
      notes,
      phone_verified: body.phone_verified === true,
      source: "recovered",
      inquiry_type: inquiryType,
      scrap_condition: scrapCondition,
      scrap_asking_price_aed: scrapAskingPrice,
      marketing_consent: partial.consent === true,
      call_center_id: callCenterId,
      purchaser_id: purchaserId,
      status: target === "inspection_scheduled" ? "inspection_scheduled" : "new",
      inspection_scheduled_at: inspectionScheduledAt?.toISOString() ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    const migrationMissing = /inquiry_type|scrap_condition|scrap_asking_price_aed/i.test(insertError.message ?? "");
    return fail(migrationMissing ? "Scrap setup is incomplete. Apply the latest database migration first." : insertError.message, 500);
  }

  const { data: linkedPartial, error: linkError } = await supabase
    .from("partial_leads")
    .update({ converted_lead_id: lead.id, converted_at: new Date().toISOString() })
    .eq("id", partialId)
    .is("converted_lead_id", null)
    .select("id")
    .maybeSingle();

  if (linkError || !linkedPartial) {
    await supabase.from("leads").delete().eq("id", lead.id);
    return fail(linkError?.message ?? "This form was already converted into a lead.", linkError ? 500 : 409);
  }

  if (target === "deal") {
    const { error: dealError } = await supabase.rpc("record_lead_deal", {
      p_lead_id: lead.id,
      p_purchase_price: price,
      p_purchased_at: purchasedAt.toISOString(),
    });

    if (dealError) {
      await supabase
        .from("partial_leads")
        .update({ converted_lead_id: null, converted_at: null })
        .eq("id", partialId);
      await supabase.from("leads").delete().eq("id", lead.id);
      return fail(dealError.message, 400);
    }
  }

  try {
    const events: Array<{ lead_id: string; type: string; meta: Record<string, unknown> }> = [
      {
        lead_id: lead.id,
        type: "lead_created",
        meta: { source: "recovered", inquiry_type: inquiryType, from_partial_lead: partialId },
      },
      { lead_id: lead.id, type: "status_change", meta: { from: "new", to: target } },
    ];
    if (purchaserId) events.push({ lead_id: lead.id, type: "assigned", meta: { purchaser_id: purchaserId, reason: "inspection_scheduled" } });
    if (target === "inspection_scheduled") events.push({ lead_id: lead.id, type: "inspection_scheduled", meta: { scheduled_at: inspectionScheduledAt?.toISOString() } });
    if (target === "deal") events.push({ lead_id: lead.id, type: "car_purchased", meta: { purchase_price_aed: price } });
    await supabase.from("lead_events").insert(events);
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, data: { id: partialId, leadId: lead.id } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await authorizePartialLead(params.id);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, data: { partialLead: access.partial } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const access = await authorizePartialLead(params.id);
  if (!access.ok) return access.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  if (body.status === "deal" || body.status === "closed") {
    return fail("Deal and Not Purchased are recorded by the Purchaser on the real Lead after inspection.", 403);
  }

  if (body.status === "inspection_scheduled") {
    return convertPartialToLead(params.id, body, "inspection_scheduled", access.identity);
  }

  let nextStatus: string | undefined;
  let nextNotes: string | undefined;
  let nextSpecification: string | null | undefined;
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) {
      return fail("Invalid status.", 400);
    }
    nextStatus = body.status;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") return fail("Invalid notes.", 400);
    nextNotes = body.notes;
  }

  if (body.specification !== undefined) {
    if (body.specification === null || body.specification === "") {
      nextSpecification = null;
    } else if (typeof body.specification === "string") {
      nextSpecification = body.specification.trim();
    }
  }

  const supabase = getSupabaseAdmin();
  const current = access.partial;

  const status = nextStatus ?? current.status;
  const notes = nextNotes ?? current.notes ?? "";
  const specification = nextSpecification !== undefined ? nextSpecification : current.specification;

  const updatePayload: Record<string, unknown> = {
    status,
    notes,
    updated_at: new Date().toISOString(),
  };
  if (nextSpecification !== undefined) {
    updatePayload.specification = specification;
  }

  let { error: updateError } = await supabase
    .from("partial_leads")
    .update(updatePayload)
    .eq("id", params.id)
    .is("converted_lead_id", null);

  if (updateError && updateError.message?.includes("specification")) {
    const { error: fallbackError } = await supabase
      .from("partial_leads")
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .is("converted_lead_id", null);
    updateError = fallbackError;
  }

  if (updateError) return fail(updateError.message, 500);

  const events = [];
  if ((current.notes ?? "") !== notes) {
    events.push({
      partial_lead_id: params.id,
      type: "note_updated",
      meta: { from: current.notes ?? "", to: notes },
    });
  }
  if (current.status !== status) {
    events.push({
      partial_lead_id: params.id,
      type: "status_changed",
      meta: { from: current.status, to: status },
    });
  }
  if (events.length > 0) {
    try {
      await supabase.from("partial_lead_events").insert(events);
    } catch {
      // non-fatal if optional audit table is missing
    }
  }

  return NextResponse.json({ ok: true, data: { id: params.id } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const access = await authorizePartialLead(params.id);
  if (!access.ok) return access.response;

  const { error } = await getSupabaseAdmin()
    .from("partial_leads")
    .delete()
    .eq("id", params.id)
    .is("converted_lead_id", null);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true, data: { id: params.id } });
}
