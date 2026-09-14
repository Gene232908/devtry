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

  let body: { modelId?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid request." } },
      { status: 400 },
    );
  }

  const modelId = typeof body.modelId === "string" ? body.modelId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!modelId) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: "Choose a model and enter a trim name." },
      },
      { status: 400 },
    );
  }
  const validationError = catalogNameError(name, "Trim");
  if (validationError) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: validationError },
      },
      { status: 400 },
    );
  }
  const [{ data: model }, duplicateCheck] = await Promise.all([
    getSupabaseAdmin()
      .from("car_models")
      .select("name, car_makes!inner(name)")
      .eq("id", modelId)
      .maybeSingle(),
    activeCatalogDuplicate("car_trims", name, "model_id", modelId),
  ]);
  if (!model)
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "That model is unavailable. Refresh the catalog and retry.",
        },
      },
      { status: 400 },
    );
  if (duplicateCheck.error)
    return NextResponse.json(
      { ok: false, error: { message: duplicateCheck.error.message } },
      { status: 500 },
    );
  const makeName =
    (model.car_makes as { name?: string } | null)?.name ?? "this model";
  if (duplicateCheck.duplicate)
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `Trim "${duplicateCheck.duplicate.name}" already exists under ${makeName} → ${model.name}.`,
        },
      },
      { status: 409 },
    );

  const { data, error } = await getSupabaseAdmin()
    .from("car_trims")
    .insert({ model_id: modelId, name })
    .select("id, model_id, name, display_order")
    .single();

  if (error) {
    // 23505 = unique violation on (model_id, name).
    const message =
      error.code === "23505"
        ? "That trim already exists for this model."
        : error.message;
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }

  await recordCatalogActivity(auth.identity, {
    entityType: "trim",
    entityId: data.id,
    entityName: data.name,
    parentName: `${makeName} ${model.name}`,
    action: "created",
  });

  return NextResponse.json({ ok: true, data: { trim: data } });
}
