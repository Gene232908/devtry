import { NextResponse } from "next/server";
import { canSeeLead } from "@/lib/auth/lead-visibility";
import { requireStaff } from "@/lib/server/require-staff";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase.from("leads").select("status, call_center_id, purchaser_id").eq("id", params.id).maybeSingle();
  if (!lead || !canSeeLead({ status: lead.status, callCenterId: lead.call_center_id, purchaserId: lead.purchaser_id }, auth.identity.role, auth.identity.userId)) return NextResponse.json({ ok: false, error: { message: "Lead not found." } }, { status: 404 });
  const { data: referral, error } = await supabase.from("lead_referrals").select("proof_storage_path, proof_content_type").eq("lead_id", params.id).maybeSingle();
  if (error || !referral) return NextResponse.json({ ok: false, error: { message: "Referral proof not found." } }, { status: 404 });
  const { data: file, error: downloadError } = await supabase.storage.from("referral-proofs").download(referral.proof_storage_path);
  if (downloadError || !file) return NextResponse.json({ ok: false, error: { message: "Referral proof is unavailable." } }, { status: 404 });
  return new NextResponse(await file.arrayBuffer(), { headers: { "Content-Type": referral.proof_content_type, "Content-Disposition": "inline; filename=referral-proof" } });
}
