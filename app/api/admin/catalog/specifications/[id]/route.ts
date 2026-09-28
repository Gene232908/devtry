import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });

  const { error } = await getSupabaseAdmin().from("vehicle_specifications").delete().eq("id", resolvedParams.id);
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: { id: resolvedParams.id } });
}
