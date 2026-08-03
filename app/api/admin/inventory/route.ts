import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mapDbInventory, type DbInventory } from "@/lib/admin/inventory";

export const dynamic = "force-dynamic";

// Cars the business has bought and owns. Read-only: stock is created by
// recording a deal on a lead (PATCH /api/leads/[id]), never directly here, so
// a car can only exist if there is a lead and a purchase price behind it.

const SELECT = `
  id, lead_id, make, model, trim, year, mileage_km,
  purchase_price_aed, purchased_at, status, sale_price_aed, sold_at, notes,
  commission_entries ( profit_aed, rate, commission_aed, sold_at )
`;

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const leadId = req.nextUrl.searchParams.get("leadId");

  let query = getSupabaseAdmin().from("inventory").select(SELECT).order("purchased_at", { ascending: false });
  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const items = ((data ?? []) as unknown as DbInventory[]).map(mapDbInventory);

  return NextResponse.json({ ok: true, data: { items } });
}
