import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";
import { AGENT_COMMISSION_RATE, COMMISSION_RATE, INVENTORY_STATUS_OPTIONS, PURCHASER_COMMISSION_RATE } from "@/lib/admin/inventory";

export const dynamic = "force-dynamic";

// Two different kinds of change live here, and they are deliberately separate
// actions rather than one free-form status write:
//
//   sell    — records the sale price and freezes the developer's share. Goes
//             through sell_inventory_item() so the sale and its commission
//             entry are written in one transaction.
//   default — moving between in_stock / reserved / withdrawn, and notes. No
//             money involved.
//
// "sold" is not accepted as a plain status. Allowing it would let a car be
// marked sold without a sale price, which is a sale that can never be invoiced.

const PLAIN_STATUSES = new Set<string>(INVENTORY_STATUS_OPTIONS);

async function canManageExpenses(inventoryId: string, userId: string, role: string) {
  if (role === "admin" || role === "manager") return true;
  const { data } = await getSupabaseAdmin()
    .from("inventory")
    .select("leads ( call_center_id, purchaser_id )")
    .eq("id", inventoryId)
    .maybeSingle();
  const lead = Array.isArray(data?.leads) ? data.leads[0] : data?.leads;
  return role === "call_center"
    ? lead?.call_center_id === userId
    : role === "purchaser" && lead?.purchaser_id === userId;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Every write here moves money (a sale) or the record of an asset (status,
  // notes) — this had no role check at all beyond "middleware confirmed a
  // session exists," so any authenticated staff account, including a call
  // centre agent with no `viewInventory` capability and a sidebar that hides
  // this whole page, could sell a car by calling the endpoint directly.
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }
  let body: { action?: unknown; status?: unknown; notes?: unknown; sale_price_aed?: unknown; sold_at?: unknown; financial_review_version?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const expenseAction = body.action === "confirm_expenses";
  const reopenAction = body.action === "reopen_finances";
  if (expenseAction && auth.identity.role !== "admin") {
    return NextResponse.json({ ok: false, error: { message: "Only Super Admin can confirm expenses." } }, { status: 403 });
  }
  if (!hasCapability(auth.identity, "viewInventory") && !(expenseAction && await canManageExpenses(params.id, auth.identity.userId, auth.identity.role))) {
    return NextResponse.json({ ok: false, error: { message: "Not authorized." } }, { status: 403 });
  }

  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const id = params.id;

  const supabase = getSupabaseAdmin();

  if (reopenAction) {
    if (auth.identity.role !== "admin" && auth.identity.role !== "manager") {
      return NextResponse.json({ ok: false, error: { message: "Only Super Admin can reopen a financial review." } }, { status: 403 });
    }
    const reason = typeof (body as { correction_reason?: unknown }).correction_reason === "string"
      ? (body as { correction_reason: string }).correction_reason.trim() : "";
    const { error } = await supabase.rpc("reopen_inventory_finances", {
      p_inventory_id: id, p_actor_id: auth.identity.userId, p_reason: reason,
    });
    if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
    const { data: inventory } = await supabase.from("inventory").select("lead_id").eq("id", id).maybeSingle();
    if (inventory?.lead_id) {
      const { error: activityError } = await supabase.from("lead_events").insert({
        lead_id: inventory.lead_id,
        actor: auth.identity.userId,
        type: "financial_review_reopened",
        meta: {
          reason,
          actor_name: auth.identity.displayName,
          actor_role: auth.identity.role,
        },
      });
      if (activityError) return NextResponse.json({ ok: false, error: { message: activityError.message } }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: { id, financialStatus: "awaiting_confirmation" } });
  }

  if (body.action === "confirm_expenses") {
    const version = Number(body.financial_review_version);
    if (!Number.isInteger(version) || version < 0) {
      return NextResponse.json({ ok: false, error: { message: "Review the latest expenses before confirming." } }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("finalize_inventory_finances", {
      p_inventory_id: id,
      p_actor_id: auth.identity.userId,
      p_expected_review_version: version,
      p_rate: COMMISSION_RATE,
      p_agent_rate: AGENT_COMMISSION_RATE,
      p_purchaser_rate: PURCHASER_COMMISSION_RATE,
    });
    if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
    const entry = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, data: { id, commission: entry ? {
      profitAed: Number(entry.profit_aed), rate: Number(entry.rate), commissionAed: Number(entry.commission_aed), soldAt: entry.sold_at,
    } : null } });
  }

  if (body.action === "sell") {
    const price = Number(body.sale_price_aed);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { ok: false, error: { message: "Enter the price the car was actually sold for." } },
        { status: 400 },
      );
    }

    const soldAt =
      typeof body.sold_at === "string" && body.sold_at.trim() !== "" ? new Date(body.sold_at) : new Date();

    if (Number.isNaN(soldAt.getTime())) {
      return NextResponse.json({ ok: false, error: { message: "Invalid sale date." } }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("sell_inventory_item", {
      p_inventory_id: id,
      p_sale_price: price,
      p_sold_at: soldAt.toISOString(),
      p_rate: COMMISSION_RATE,
      // Credits whichever agent and purchaser the car's lead carries, in the
      // same transaction as the sale — see migration 0025.
      p_agent_rate: AGENT_COMMISSION_RATE,
      p_purchaser_rate: PURCHASER_COMMISSION_RATE,
    });

    if (error) {
      // "already sold" and "sale price must be zero or more" are raised with
      // wording the owner can act on — surface it rather than a generic error.
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id,
        financialStatus: (Array.isArray(data) ? data[0] : data)?.financial_status ?? "awaiting_confirmation",
      },
    });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.status === "string") {
    if (!PLAIN_STATUSES.has(body.status)) {
      return NextResponse.json(
        { ok: false, error: { message: "A car is marked as sold by recording its sale price." } },
        { status: 400 },
      );
    }
    update.status = body.status;
  }

  if (typeof body.notes === "string") update.notes = body.notes;

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ ok: true, data: { id, unchanged: true } });
  }

  // A sold car is a settled financial record; its status is not editable
  // afterwards, or the commission entry would describe a sale that no longer
  // matches the car it was calculated from.
  const { data, error } = await supabase
    .from("inventory")
    .update(update)
    .eq("id", id)
    .neq("status", "sold")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: { message: "This car has been sold — its record can no longer be changed." } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data: { id } });
}
