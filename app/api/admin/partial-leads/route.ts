import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PARTIAL_LEAD_COLUMNS } from "@/lib/admin/partial-lead";

// Admin-only (gated by middleware.ts, which requires a session for /api/admin/*).
// Lists valuation forms that were started but never submitted.
//
// Read-only. Updating or deleting a single capture lives on
// /api/admin/partial-leads/[id], so there is exactly one route that can change
// a given row.

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("partial_leads")
    .select(PARTIAL_LEAD_COLUMNS)
    // Only unconverted rows are ever returned, so someone who later completed
    // the form disappears from here automatically and is never shown in both
    // places.
    .is("converted_lead_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { partialLeads: data ?? [] } });
}
