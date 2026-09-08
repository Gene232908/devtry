import { NextResponse } from "next/server";
import { fetchAdminStats } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";

// The dashboard Overview periodically refetches the figures using this route so
// it stays live without needing a full page reload.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const dateRange = from && to ? { from, to } : undefined;

  const result = await fetchAdminStats(auth.identity, dateRange);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
