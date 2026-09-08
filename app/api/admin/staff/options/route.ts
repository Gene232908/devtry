import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/server/require-staff";
import { type StaffRole, hasCapability } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });

  // Any authenticated staff can see options (for reading names of assignees)
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, display_name, role")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });

  const staffOptions = (data ?? []).map((p: { id: string; display_name: string | null; role: string }) => ({
    id: p.id,
    name: p.display_name ?? p.id,
    role: p.role as StaffRole,
  }));

  const canAssign = hasCapability(auth.identity, "assignLeads");

  return NextResponse.json({ ok: true, data: { staffOptions, canAssign } });
}
