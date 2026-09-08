import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PARTIAL_STATUSES_ALLOWED } from "@/lib/admin/partial-lead";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { fetchPartialLead } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

// Mirrors the CHECK constraint on partial_leads.status.
const ALLOWED_STATUSES = new Set<string>(PARTIAL_STATUSES_ALLOWED);

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
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

/**
 * Marks an abandoned form as a Deal: converts it to a real lead, then records
 * the purchase. See ADR-004 for why converting is the right answer rather than
 * refusing.
 */
async function convertToDealtLead(partialId: string, body: Record<string, unknown>) {
  const price = Number(body.purchase_price_aed);
  if (!Number.isFinite(price) || price <= 0) {
    return fail("Enter the price the car was actually bought for.", 400);
  }

  const purchasedAt =
    typeof body.purchased_at === "string" && body.purchased_at.trim() !== ""
      ? new Date(body.purchased_at)
      : new Date();
  if (Number.isNaN(purchasedAt.getTime())) return fail("Invalid purchase date.", 400);

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

  const fullName = str(body.full_name) ?? str(partial.full_name);
  const make = str(body.make) ?? str(partial.make);
  const model = str(body.model) ?? str(partial.model);
  const year = int(body.year) ?? int(partial.year);

  const missing = [
    !fullName && "customer name",
    !make && "make",
    !model && "model",
    !year && "year",
  ].filter(Boolean);

  if (missing.length > 0) {
    return fail(`Please fill in the ${missing.join(", ")} before recording this as a deal.`, 400);
  }

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      phone_e164: partial.phone_e164,
      make,
      model,
      trim: str(body.trim),
      year,
      mileage_km: int(body.mileage_km) ?? int(partial.mileage_km),
      emirate: str(body.emirate),
      description: str(partial.description),
      notes: str(body.notes),
      phone_verified: body.phone_verified === true,
      source: "recovered",
      marketing_consent: partial.consent === true,
    })
    .select("id")
    .single();

  if (insertError) return fail(insertError.message, 500);

  const { error: linkError } = await supabase
    .from("partial_leads")
    .update({ converted_lead_id: lead.id, converted_at: new Date().toISOString() })
    .eq("id", partialId);

  if (linkError) {
    await supabase.from("leads").delete().eq("id", lead.id);
    return fail(linkError.message, 500);
  }

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

  try {
    await supabase.from("lead_events").insert([
      {
        lead_id: lead.id,
        type: "lead_created",
        meta: { source: "recovered", from_partial_lead: partialId },
      },
      { lead_id: lead.id, type: "status_change", meta: { from: "new", to: "deal" } },
      { lead_id: lead.id, type: "car_purchased", meta: { purchase_price_aed: price } },
    ]);
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, data: { id: partialId, leadId: lead.id } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await fetchPartialLead(params.id);
  if (!result.ok) return fail(result.message, result.status);
  return NextResponse.json({ ok: true, data: result.data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  if (body.status === "deal") {
    return convertToDealtLead(params.id, body);
  }

  let nextStatus: string | undefined;
  let nextNotes: string | undefined;
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

  const supabase = getSupabaseAdmin();
  const { data: current, error: readError } = await supabase
    .from("partial_leads")
    .select("status, notes")
    .eq("id", params.id)
    .is("converted_lead_id", null)
    .maybeSingle();
  if (readError) return fail(readError.message, 500);
  if (!current) return fail("Incomplete form not found.", 404);

  const status = nextStatus ?? current.status;
  const notes = nextNotes ?? current.notes ?? "";

  const rpc = await supabase.rpc("update_partial_lead_follow_up", {
    p_id: params.id,
    p_status: status,
    p_notes: notes,
  });

  if (rpc.error) {
    if (!rpc.error.message.toLowerCase().includes("could not find the function")) {
      return fail(rpc.error.message, 500);
    }

    const { error: updateError } = await supabase
      .from("partial_leads")
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .is("converted_lead_id", null);
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
      const { error: eventError } = await supabase.from("partial_lead_events").insert(events);
      if (eventError) return fail(eventError.message, 500);
    }
  }

  return NextResponse.json({ ok: true, data: { id: params.id } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const { error } = await getSupabaseAdmin().from("partial_leads").delete().eq("id", params.id);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true, data: { id: params.id } });
}
