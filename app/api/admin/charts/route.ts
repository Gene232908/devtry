import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { startOfUaeDayUtc, uaeDayOfWeek } from "@/lib/uae-time";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Days are grouped by UAE calendar day, not the server's local/UTC day - see lib/uae-time.ts.
// This is just a stable grouping key (not displayed), safe to derive from the UTC instant.
function dayKey(d: Date) {
  return startOfUaeDayUtc(d).toISOString().slice(0, 10);
}

function buildLast7Days() {
  const today = startOfUaeDayUtc();
  const days: { key: string; day: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    // UAE has no DST, so every day is exactly 24h - safe to step by milliseconds.
    const d = new Date(today.getTime() - i * ONE_DAY_MS);
    days.push({ key: dayKey(d), day: DAY_LABELS[uaeDayOfWeek(d)] });
  }
  return days;
}

function countByDay(rows: { created_at: string }[], days: { key: string; day: string }[]) {
  const counts = new Map(days.map((d) => [d.key, 0]));
  for (const row of rows) {
    const key = dayKey(new Date(row.created_at));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ day: d.day, count: counts.get(d.key) ?? 0 }));
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const days = buildLast7Days();
  const rangeStart = days[0].key;

  const supabase = getSupabaseAdmin();
  const [visitorsRes, leadsRes] = await Promise.all([
    supabase.from("events").select("created_at").eq("type", "page_view").gte("created_at", `${rangeStart}T00:00:00.000Z`),
    supabase.from("leads").select("created_at").gte("created_at", `${rangeStart}T00:00:00.000Z`),
  ]);

  if (visitorsRes.error || leadsRes.error) {
    return NextResponse.json(
      { ok: false, error: { message: visitorsRes.error?.message ?? leadsRes.error?.message ?? "Query failed." } },
      { status: 500 },
    );
  }

  const visitors = countByDay(visitorsRes.data ?? [], days).map((d) => ({ day: d.day, visitors: d.count }));
  const submissions = countByDay(leadsRes.data ?? [], days).map((d) => ({ day: d.day, submissions: d.count }));

  return NextResponse.json({ ok: true, data: { visitors, submissions } });
}
