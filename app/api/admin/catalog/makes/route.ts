import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: { message: "Enter a brand name." } }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("car_makes")
    .insert({ name })
    .select("id, name, display_order")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That brand already exists." : error.message;
    return NextResponse.json({ ok: false, error: { message } }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ ok: true, data: { make: data } });
}
