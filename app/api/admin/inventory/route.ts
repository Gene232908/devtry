import { NextRequest, NextResponse } from "next/server";
import { fetchInventory } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

// Cars the business has bought and owns. Read-only: stock is created by
// recording a deal on a lead (PATCH /api/leads/[id]), never directly here, so
// a car can only exist if there is a lead and a purchase price behind it.
//
// The query itself lives in lib/admin/queries.ts so the Inventory page can run
// it during its own server render instead of loading empty and then calling
// this route over HTTP. This route is unchanged from the caller's point of
// view and is still what the Refresh button and every client-side reload use.

export async function GET(req: NextRequest) {
  const result = await fetchInventory(req.nextUrl.searchParams.get("leadId"));

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
