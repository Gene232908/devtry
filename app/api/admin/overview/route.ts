import { NextResponse } from "next/server";
import { fetchExecutiveOverview, type OverviewRange } from "@/lib/admin/executive-overview";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

function readRange(search: URLSearchParams, fromKey: string, toKey: string): OverviewRange | null {
  const from = search.get(fromKey);
  const to = search.get(toKey);
  if (!from && !to) return null;
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Financial CEO Overview. Owner-only because it includes profit and staff commission figures. */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const range = readRange(searchParams, "from", "to");
    if (!range) {
      return NextResponse.json({ ok: false, error: { message: "Choose a valid dashboard date range." } }, { status: 400 });
    }
    const comparisonRange = readRange(searchParams, "compareFrom", "compareTo") ?? undefined;
    const result = await fetchExecutiveOverview(range, comparisonRange);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
    }
    return NextResponse.json({ ok: true, data: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  }
}
