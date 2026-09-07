import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { modelId?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const modelId = typeof body.modelId === "string" ? body.modelId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!modelId || !name) {
    return NextResponse.json(
      { ok: false, error: { message: "Choose a model and enter a trim name." } },
      { status: 400 },
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("car_trims")
    .insert({ model_id: modelId, name })
    .select("id, model_id, name, display_order")
    .single();

  if (error) {
    // 23505 = unique violation on (model_id, name).
    const message = error.code === "23505" ? "That trim already exists for this model." : error.message;
    return NextResponse.json({ ok: false, error: { message } }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ ok: true, data: { trim: data } });
}
