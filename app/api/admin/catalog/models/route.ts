import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { makeId?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const makeId = typeof body.makeId === "string" ? body.makeId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!makeId || !name) {
    return NextResponse.json({ ok: false, error: { message: "Choose a brand and enter a model name." } }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("car_models")
    .insert({ make_id: makeId, name })
    .select("id, make_id, name, display_order")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That model already exists for this brand." : error.message;
    return NextResponse.json({ ok: false, error: { message } }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ ok: true, data: { model: data } });
}
