import { NextResponse } from "next/server";
import { fetchAdminCharts } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";

// The series live in lib/admin/queries.ts so the Overview page can build them
// during its own server render. This route is unchanged for callers.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  const result = await fetchAdminCharts(auth.identity);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
