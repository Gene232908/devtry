import { NextResponse } from "next/server";
import { fetchAdminStats } from "@/lib/admin/queries";

// Always run at request time (never prerender/cache): admin stats must be live.
//
// The counts live in lib/admin/queries.ts so the Overview page can run them
// during its own server render. This route is unchanged for callers.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchAdminStats();

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
