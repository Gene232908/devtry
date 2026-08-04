import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { COMMISSION_RATE, INVENTORY_STATUS_OPTIONS } from "@/lib/admin/inventory";

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const id = params.id;
  let body: { action?: unknown; status?: unknown; notes?: unknown; sale_price_aed?: unknown; sold_at?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

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
    });

    if (error) {
      // "already sold" and "sale price must be zero or more" are raised with
      // wording the owner can act on — surface it rather than a generic error.
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 400 });
    }

    // The function returns the frozen commission entry it wrote.
    const entry = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      ok: true,
      data: {
        id,
        commission: entry
          ? {
              profitAed: Number(entry.profit_aed),
              rate: Number(entry.rate),
              commissionAed: Number(entry.commission_aed),
              soldAt: entry.sold_at,
            }
          : null,
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
