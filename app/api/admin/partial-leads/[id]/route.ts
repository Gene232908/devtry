import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PARTIAL_LEAD_COLUMNS, PARTIAL_STATUSES_ALLOWED } from "@/lib/admin/partial-lead";
import { blockedByPreview } from "@/lib/admin/preview-guard";

// Admin-only (gated by middleware.ts for /api/admin/*). Single incomplete
// valuation form: read it, record follow-up on it, or delete it.

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
 *
 * The order matters and is not interchangeable:
 *
 *   1. create the lead        — inventory cannot exist without one
 *   2. link the partial to it — so the person leaves Incomplete Forms
 *   3. record_lead_deal()     — moves the lead to 'deal' AND creates the car,
 *                               in one database transaction
 *
 * If step 3 fails the lead is deleted again, so a failure cannot leave a
 * half-converted record behind: no lead without a car, no partial that has
 * vanished from both lists.
 *
 * `phone_verified` is false and `source` is 'recovered' deliberately. Nobody
 * proved this number — the justification for the lead is a purchase the
 * business made, and the record says so rather than hiding it.
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

  // The admin can supply anything the form never captured — a capture that
  // stopped at step 1 has no car at all. Whatever they send wins, because they
  // just agreed the purchase with the customer and the form is months stale by
  // comparison.
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
    // Named explicitly: "invalid request" would leave the owner guessing which
    // box to fill on a screen where most of them are optional.
    return fail(`Please fill in the ${missing.join(", ")} before recording this as a deal.`, 400);
  }

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      phone_e164: partial.phone_e164,
      make,
      model,
      // `trim` and `emirate` have no equivalent on partial_leads — the form
      // only captures them at step 3, and nothing writes them back. They can
      // therefore come from the admin or from nowhere; both are optional on
      // `leads`, so a missing one is recorded honestly as unknown rather than
      // guessed.
      trim: str(body.trim),
      year,
      mileage_km: int(body.mileage_km) ?? int(partial.mileage_km),
      emirate: str(body.emirate),
      description: str(partial.description),
      notes: str(body.notes),
      // False unless an admin explicitly asserted they spoke to this customer
      // on this number. `=== true` rather than a truthy check: this flag decides
      // whether the OTP guards ever trust the number again, so a stray "1" or
      // "yes" in the payload must not be enough to set it.
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
    // Unwind: unlink first so the partial reappears in Incomplete Forms, then
    // remove the lead. Leaving either behind would be worse than failing.
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
    // non-fatal: the conversion itself succeeded
  }

  return NextResponse.json({ ok: true, data: { id: partialId, leadId: lead.id } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return fail("Database is not configured.", 503);

  const { data, error } = await getSupabaseAdmin()
    .from("partial_leads")
    .select(PARTIAL_LEAD_COLUMNS)
    .eq("id", params.id)
    // Converted rows are no longer incomplete — that person is a real lead now,
    // so their detail page lives under Leads instead.
    .is("converted_lead_id", null)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Not found.", 404);

  return NextResponse.json({ ok: true, data: { partialLead: data } });
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

  // Marking an abandoned form as a Deal turns it into a real lead first — see
  // ADR-004. Everything about that path is different enough to keep separate.
  if (body.status === "deal") {
    return convertToDealtLead(params.id, body);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) {
      return fail("Invalid status.", 400);
    }
    update.status = body.status;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") return fail("Invalid notes.", 400);
    update.notes = body.notes;
  }

  const { error } = await getSupabaseAdmin().from("partial_leads").update(update).eq("id", params.id);
  if (error) return fail(error.message, 500);

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
