import { NextResponse } from "next/server";
import { fetchPartialLeads } from "@/lib/admin/queries";

// Admin-only (gated by middleware.ts, which requires a session for /api/admin/*).
// Lists valuation forms that were started but never submitted.
//
// Read-only. Updating or deleting a single capture lives on
// /api/admin/partial-leads/[id], so there is exactly one route that can change
// a given row.
//
// The query lives in lib/admin/queries.ts so the Incomplete Forms page can run
// it during its own server render. This route is unchanged for callers and is
// still the path used for refreshes.

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchPartialLeads();

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
