import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

/**
 * POST — settle everything currently owed to one agent or purchaser.
 *
 * Owner-only, same as marking the developer's own statements paid: this moves
 * money, and unlike GET /api/admin/commission/staff a staff member reading
 * their own balance is not the same permission as being able to zero it out.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { staffId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  if (typeof body.staffId !== "string" || body.staffId.trim() === "") {
    return NextResponse.json({ ok: false, error: { message: "Choose who to pay." } }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Confirms this id is actually a call centre or purchaser account before
  // touching money against it — the same defensive check the assignment
  // routes make before writing an id a client sent.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", body.staffId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: { message: profileError.message } }, { status: 500 });
  }
  if (!profile || (profile.role !== "call_center" && profile.role !== "purchaser")) {
    return NextResponse.json({ ok: false, error: { message: "That account does not earn commission." } }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("pay_staff_commission", { p_staff_id: body.staffId });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    ok: true,
    data: {
      staffId: body.staffId,
      paidCount: Number(result?.paid_count ?? 0),
      paidTotal: Number(result?.paid_total ?? 0),
    },
  });
}
