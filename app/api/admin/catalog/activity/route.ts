import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function parseDubaiDay(value: string) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const gb = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const year = Number(iso?.[1] ?? gb?.[3]);
  const month = Number(iso?.[2] ?? gb?.[2]);
  const day = Number(iso?.[3] ?? gb?.[1]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCDate() !== day || calendarDate.getUTCMonth() !== month - 1) return null;
  const start = new Date(calendarDate.getTime() - 4 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  if (!isSupabaseConfigured())
    return NextResponse.json(
      { ok: false, error: { message: "Database is not configured." } },
      { status: 503 },
    );

  const rawOffset = Number(req.nextUrl.searchParams.get("offset") ?? "0");
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 10_000) : 0;
  const rawQuery = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);

  let query = getSupabaseAdmin()
    .from("catalog_activity")
    .select(
      "id, entity_type, entity_id, entity_name, parent_name, action, actor_name, created_at",
    )
    .order("created_at", { ascending: false });

  const date = parseDubaiDay(rawQuery);
  if (date) {
    query = query.gte("created_at", date.start).lt("created_at", date.end);
  } else if (rawQuery) {
    const term = rawQuery.replace(/[^A-Za-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    if (term) {
      const pattern = `%${term}%`;
      query = query.or(`entity_name.ilike.${pattern},parent_name.ilike.${pattern},actor_name.ilike.${pattern},action.ilike.${pattern}`);
    }
  }

  const { data, error } = await query.range(offset, offset + PAGE_SIZE);

  // The rest of the catalog stays usable if a deployment precedes migration
  // 0029; activity simply has no historical entries until it is applied.
  if (error?.code === "42P01")
    return NextResponse.json({ ok: true, data: { events: [], hasMore: false } });
  if (error)
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 500 },
    );
  const rows = data ?? [];
  return NextResponse.json({ ok: true, data: { events: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE } });
}
