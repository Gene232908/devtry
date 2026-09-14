import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const { data, error } = await getSupabaseAdmin()
    .from("catalog_activity")
    .select(
      "id, entity_type, entity_id, entity_name, parent_name, action, actor_name, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(10);

  // The rest of the catalog stays usable if a deployment precedes migration
  // 0029; activity simply has no historical entries until it is applied.
  if (error?.code === "42P01")
    return NextResponse.json({ ok: true, data: { events: [] } });
  if (error)
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data: { events: data ?? [] } });
}
