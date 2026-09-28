import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
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
    body = (await req.json()) as { callCenterId?: unknown; purchaserId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid JSON." } }, { status: 400 });
  }

  const { callCenterId, purchaserId } = body as { callCenterId?: string | null; purchaserId?: string | null };

  // A partial form is recovery work for Call Centre only. A Purchaser is
  // assigned later, when the CSR confirms the details and converts it into an
  // inspection-scheduled real lead.
  if (purchaserId !== undefined && purchaserId !== null && purchaserId !== "") {
    return NextResponse.json({ ok: false, error: { message: "Purchasers are assigned only after an incomplete form becomes a real lead." } }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Validate that the assigned staff members are actually active and have the correct role
  if (callCenterId) {
    const ids = [];
    if (callCenterId) ids.push(callCenterId);

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
  }

  // Update partial lead
  const { error } = await supabase
    .from("partial_leads")
    .update({
      call_center_id: callCenterId || null,
      purchaser_id: null,
    })
    .eq("id", resolvedParams.id);

  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });

  // Record history
  await supabase.from("partial_lead_events").insert({
    partial_lead_id: resolvedParams.id,
    type: "assigned",
    meta: { call_center_id: callCenterId || null },
  });

  return NextResponse.json({ ok: true });
}
