import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();

  // Protect the last active owner from being deleted
  const { data: wouldRemoveLast, error: guardError } = await supabase.rpc(
    "would_remove_last_owner",
    { p_user_id: resolvedParams.id },
  );
  if (guardError) {
    return NextResponse.json({ ok: false, error: { message: guardError.message } }, { status: 500 });
  }
  if (wouldRemoveLast) {
    return NextResponse.json(
      { ok: false, error: { message: "Cannot delete the last remaining active owner account." } },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("profiles").delete().eq("id", resolvedParams.id);
  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { id: resolvedParams.id } });
}
