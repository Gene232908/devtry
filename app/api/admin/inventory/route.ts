import { NextRequest, NextResponse } from "next/server";
import { fetchInventory } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/server/require-staff";
import { hasCapability } from "@/lib/auth/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { canSeeLead } from "@/lib/auth/lead-visibility";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  const leadId = req.nextUrl.searchParams.get("leadId");

  // If requesting the full inventory list, must hold the viewInventory capability.
  if (!leadId) {
    if (!hasCapability(auth.identity, "viewInventory")) {
      return NextResponse.json({ ok: false, error: { message: "Not authorized to view inventory." } }, { status: 403 });
    }
  } else {
    // If requesting inventory for a specific lead, caller must either have viewInventory OR be assigned to that lead
    if (!hasCapability(auth.identity, "viewInventory")) {
      const supabase = getSupabaseAdmin();
      const { data: lead } = await supabase
        .from("leads")
        .select("status, call_center_id, purchaser_id")
        .eq("id", leadId)
        .maybeSingle();

      if (!lead || !canSeeLead({ status: lead.status, callCenterId: lead.call_center_id, purchaserId: lead.purchaser_id }, auth.identity.role, auth.identity.userId)) {
        return NextResponse.json({ ok: false, error: { message: "Not authorized." } }, { status: 403 });
      }
    }
  }

  const result = await fetchInventory(leadId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: { message: result.message } }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
