import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });

  if (!hasCapability(auth.identity, "assignLeads")) {
    return NextResponse.json({ ok: false, error: { message: "Not authorized to assign leads." } }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  let body: { callCenterId?: unknown; purchaserId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid JSON." } }, { status: 400 });
  }

  const { callCenterId, purchaserId } = body;

  const supabase = getSupabaseAdmin();

  // Validate that the assigned staff members are actually active and have the correct role
  if (callCenterId || purchaserId) {
    const ids = [];
    if (callCenterId) ids.push(callCenterId);
    if (purchaserId) ids.push(purchaserId);

    const { data: staffProfiles, error: staffError } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .in("id", ids);

    if (staffError) return NextResponse.json({ ok: false, error: { message: staffError.message } }, { status: 500 });

    const profiles = new Map(staffProfiles.map(p => [p.id, p]));

    if (callCenterId) {
      const p = profiles.get(callCenterId);
      if (!p || p.role !== "call_center" || !p.is_active) {
        return NextResponse.json({ ok: false, error: { message: "Invalid call center assignee." } }, { status: 400 });
      }
    }
    if (purchaserId) {
      const p = profiles.get(purchaserId);
      if (!p || p.role !== "purchaser" || !p.is_active) {
        return NextResponse.json({ ok: false, error: { message: "Invalid purchaser assignee." } }, { status: 400 });
      }
    }
  }

  // Update partial lead
  const { error } = await supabase
    .from("partial_leads")
    .update({
      call_center_id: callCenterId || null,
      purchaser_id: purchaserId || null,
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });

  // Record history
  await supabase.from("partial_lead_events").insert({
    partial_lead_id: params.id,
    type: "assigned",
    meta: { call_center_id: callCenterId || null, purchaser_id: purchaserId || null },
  });

  return NextResponse.json({ ok: true });
}
