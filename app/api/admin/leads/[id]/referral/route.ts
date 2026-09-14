import { NextResponse } from "next/server";
import { canSeeLead } from "@/lib/auth/lead-visibility";
import { ROLE_LABELS, type StaffRole } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/server/require-staff";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  const supabase = getSupabaseAdmin();
  const { data: lead, error: leadError } = await supabase.from("leads").select("status, call_center_id, purchaser_id").eq("id", params.id).maybeSingle();
  if (leadError || !lead || !canSeeLead({ status: lead.status, callCenterId: lead.call_center_id, purchaserId: lead.purchaser_id }, auth.identity.role, auth.identity.userId)) return NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 });

  const { data: referral, error } = await supabase.from("lead_referrals").select("referrer_type, referrer_staff_id, referrer_client_name, proof_note, created_at").eq("lead_id", params.id).maybeSingle();
  if (error && !/lead_referrals/.test(error.message ?? "")) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  if (!referral) return NextResponse.json({ ok: true, data: { referral: null } });

  let employee: { name: string; role: string } | null = null;
  if (referral.referrer_staff_id) {
    const { data: profile } = await supabase.from("profiles").select("display_name, role").eq("id", referral.referrer_staff_id).maybeSingle();
    if (profile) {
      const role = profile.role as StaffRole;
      employee = { name: profile.display_name ?? "Staff member", role: ROLE_LABELS[role] ?? role };
    }
  }
  return NextResponse.json({ ok: true, data: { referral: { type: referral.referrer_type, employee, clientName: referral.referrer_client_name, proofNote: referral.proof_note, proofUrl: `/api/admin/leads/${encodeURIComponent(params.id)}/referral/proof`, createdAt: referral.created_at } } });
}
