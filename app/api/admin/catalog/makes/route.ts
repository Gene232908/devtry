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
  // Catalog writes are owner-only. Public reads of makes are not gated here
  // (no GET handler) — the public catalog is read by the valuation form.
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

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid request." } },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const validationError = catalogNameError(name, "Brand");
  if (validationError) {
    return NextResponse.json(
      { ok: false, error: { message: validationError } },
      { status: 400 },
    );
  }
  const duplicateCheck = await activeCatalogDuplicate("car_makes", name);
  if (duplicateCheck.error) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: duplicateCheck.error.message },
      },
      { status: 500 },
    );
  }
  if (duplicateCheck.duplicate)
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `This make already exists: ${duplicateCheck.duplicate.name}.`,
        },
      },
      { status: 409 },
    );

  const { data, error } = await getSupabaseAdmin()
    .from("car_makes")
    .insert({ name })
    .select("id, name, display_order")
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "That brand already exists." : error.message;
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }

  await recordCatalogActivity(auth.identity, {
    entityType: "make",
    entityId: data.id,
    entityName: data.name,
    action: "created",
  });

  return NextResponse.json({ ok: true, data: { make: data } });
}
