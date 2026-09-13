import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });

  const { data, error } = await getSupabaseAdmin()
    .from("vehicle_specifications")
    .select("id, name, display_order")
    .order("display_order")
    .order("name");
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: { specifications: data ?? [] } });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });

  const body = await req.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ ok: false, error: { message: "Use a specification name between 2 and 80 characters." } }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("vehicle_specifications")
    .insert({ name })
    .select("id, name, display_order")
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.code === "23505" ? "That specification already exists." : error.message } },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true, data: { specification: data } });
}
