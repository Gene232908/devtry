import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { setCatalogArchived } from "@/lib/server/catalog-archive";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
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

  const result = await setCatalogArchived(
    "make",
    resolvedParams.id,
    true,
    auth.identity,
  );
  if (!result.ok)
    return NextResponse.json(
      { ok: false, error: { message: result.message } },
      { status: result.status },
    );

  return NextResponse.json({ ok: true, data: { entry: result.data } });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
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
  const result = await setCatalogArchived(
    "make",
    resolvedParams.id,
    false,
    auth.identity,
  );
  if (!result.ok)
    return NextResponse.json(
      { ok: false, error: { message: result.message } },
      { status: result.status },
    );
  return NextResponse.json({ ok: true, data: { entry: result.data } });
}
