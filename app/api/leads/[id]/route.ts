import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";

// "deal" = the customer agreed to sell; "closed" = met but no agreement.
// "valuation_sent" stays accepted so historical rows can still be written back,
// but it is no longer offered anywhere in the UI.
const STATUSES = new Set([
  "new",
  "pending",
  "contacted",
  "inspection_scheduled",
  "inspected",
  "negotiating",
  "deal",
  "closed",
  "valuation_sent",
]);

type LeadEventInsert = { lead_id: string; type: string; meta: Record<string, unknown> };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Milestone 2: the dashboard is a design preview, so admin writes are refused
  // at the server too — the UI guard alone would still leave this endpoint open
  // to anything holding a session.
  if (ADMIN_PREVIEW) {
    return NextResponse.json(
      { ok: false, error: { message: PREVIEW_NOTICE } },
      { status: 403 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const id = params.id;
  let body: {
    status?: unknown;
    estimated_value_aed?: unknown;
    notes?: unknown;
    is_spam?: unknown;
    purchase_price_aed?: unknown;
    purchased_at?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Load the current row so we can record meaningful timeline diffs.
  const { data: current, error: loadError } = await supabase
    .from("leads")
    .select("id, status, estimated_value_aed, notes, is_spam")
    .eq("id", id)
    .single();

  if (loadError || !current) {
    return NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  const events: LeadEventInsert[] = [];

  // "Deal" means the car was bought, so it is the one status that carries money
  // with it. It is handled through record_lead_deal() rather than a plain status
  // write: that function moves the lead and creates the inventory row in a
  // single transaction, so a lead can never end up marked as bought with no car
  // behind it. Re-sending a price for a lead already at Deal corrects a typo.
  const becomingDeal = body.status === "deal";
  const correctingDealPrice = current.status === "deal" && body.purchase_price_aed !== undefined;

  if (becomingDeal || correctingDealPrice) {
    const price = Number(body.purchase_price_aed);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { ok: false, error: { message: "Enter the price the car was actually bought for." } },
        { status: 400 },
      );
    }

    const purchasedAt =
      typeof body.purchased_at === "string" && body.purchased_at.trim() !== ""
        ? new Date(body.purchased_at)
        : new Date();

    if (Number.isNaN(purchasedAt.getTime())) {
      return NextResponse.json({ ok: false, error: { message: "Invalid purchase date." } }, { status: 400 });
    }

    const { error: dealError } = await supabase.rpc("record_lead_deal", {
      p_lead_id: id,
      p_purchase_price: price,
      p_purchased_at: purchasedAt.toISOString(),
    });

    if (dealError) {
      // The function raises a readable message for the cases the owner can
      // actually act on (already sold, price not positive), so pass it through
      // rather than replacing it with something generic.
      return NextResponse.json({ ok: false, error: { message: dealError.message } }, { status: 400 });
    }

    if (current.status !== "deal") {
      events.push({ lead_id: id, type: "status_change", meta: { from: current.status, to: "deal" } });
    }
    events.push({ lead_id: id, type: "car_purchased", meta: { purchase_price_aed: price } });
  } else if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: { message: "Invalid status." } }, { status: 400 });
    }

    // A lead that has a car cannot leave "deal".
    //
    // record_lead_deal() guarantees a lead at 'deal' has an inventory row, but
    // nothing guarded the way back out — so moving the lead to any other status
    // left the car stranded: still in Inventory, still holding the money paid
    // for it, but no longer reachable from a lead anyone would look at. If that
    // car is later sold, its commission is calculated against a purchase the
    // lead no longer claims to have made.
    //
    // This is not hypothetical. It happened twice in ten seconds on one lead in
    // production, because the detail form could silently re-seed its status
    // field from a stale copy of the lead and the next Save wrote that stale
    // value back. The form bug is fixed too, but the invariant belongs here:
    // this is the only place every client has to come through.
    //
    // Undoing a purchase is a real thing an owner may need, but it means
    // removing a car from stock and unwinding money — a deliberate action with
    // its own confirmation, not a side effect of changing a dropdown.
    if (current.status === "deal" && body.status !== "deal") {
      const { data: car } = await supabase
        .from("inventory")
        .select("id, status")
        .eq("lead_id", id)
        .maybeSingle();

      if (car) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message:
                "This lead has a car recorded against it in Inventory, so it cannot be moved out of Deal. Withdraw the car from Inventory first if the purchase did not go ahead.",
            },
          },
          { status: 409 },
        );
      }
    }

    if (body.status !== current.status) {
      update.status = body.status;
      events.push({ lead_id: id, type: "status_change", meta: { from: current.status, to: body.status } });
    }
  }

  if ("estimated_value_aed" in body) {
    const raw = body.estimated_value_aed;
    const value = raw === null || raw === "" ? null : Number(raw);
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ ok: false, error: { message: "Invalid value." } }, { status: 400 });
    }
    update.estimated_value_aed = value;
    events.push({ lead_id: id, type: "value_updated", meta: { value } });
  }

  if (typeof body.notes === "string" && body.notes !== (current.notes ?? "")) {
    update.notes = body.notes;
    events.push({ lead_id: id, type: "note_updated", meta: {} });
  }

  if (typeof body.is_spam === "boolean" && body.is_spam !== current.is_spam) {
    update.is_spam = body.is_spam;
    events.push({ lead_id: id, type: "marked_spam", meta: { is_spam: body.is_spam } });
    if (body.is_spam && current.status !== "closed") {
      update.status = "closed";
      events.push({ lead_id: id, type: "status_change", meta: { from: current.status, to: "closed" } });
    }
  }

  // Only "nothing happened" when there is also nothing to record. Recording a
  // deal writes through record_lead_deal() and leaves `update` empty, so
  // checking the update alone would drop its timeline entries on the floor.
  if (Object.keys(update).length === 0 && events.length === 0) {
    return NextResponse.json({ ok: true, data: { id, unchanged: true } });
  }

  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabase.from("leads").update(update).eq("id", id);
    if (updateError) {
      return NextResponse.json({ ok: false, error: { message: updateError.message } }, { status: 500 });
    }
  }

  if (events.length > 0) {
    try {
      await supabase.from("lead_events").insert(events);
    } catch {
      // non-fatal: the update itself succeeded
    }
  }

  return NextResponse.json({ ok: true, data: { id } });
}
