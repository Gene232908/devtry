import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";
import {
  activeCatalogDuplicate,
  catalogNameError,
  recordCatalogActivity,
} from "@/lib/server/catalog-safety";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: { message: "Database is not configured." } },
      { status: 503 },
    );
  }

  let body: { makeId?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid request." } },
      { status: 400 },
    );
  }

  const makeId = typeof body.makeId === "string" ? body.makeId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!makeId) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: "Choose a brand and enter a model name." },
      },
      { status: 400 },
    );
  }
  const validationError = catalogNameError(name, "Model");
  if (validationError) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: validationError },
      },
      { status: 400 },
    );
  }
  const [{ data: make }, duplicateCheck] = await Promise.all([
    getSupabaseAdmin()
      .from("car_makes")
      .select("name")
      .eq("id", makeId)
      .maybeSingle(),
    activeCatalogDuplicate("car_models", name, "make_id", makeId),
  ]);
  if (!make)
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "That make is unavailable. Refresh the catalog and retry.",
        },
      },
      { status: 400 },
    );
  if (duplicateCheck.error)
    return NextResponse.json(
      { ok: false, error: { message: duplicateCheck.error.message } },
      { status: 500 },
    );
  if (duplicateCheck.duplicate)
    return NextResponse.json(
      {
        ok: false,
        error: { message: `This model already exists on ${make.name}.` },
      },
      { status: 409 },
    );

  const { data, error } = await getSupabaseAdmin()
    .from("car_models")
    .insert({ make_id: makeId, name })
    .select("id, make_id, name, display_order")
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "That model already exists for this brand."
        : error.message;
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }

  await recordCatalogActivity(auth.identity, {
    entityType: "model",
    entityId: data.id,
    entityName: data.name,
    parentName: make.name,
    action: "created",
  });

  return NextResponse.json({ ok: true, data: { model: data } });
}
