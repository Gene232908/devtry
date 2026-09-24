import { NextResponse } from "next/server";
import { authorizeInspectionLead } from "@/lib/inspection/access";

export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

/**
 * Repairs only the legacy/inconsistent state where an inspection report is
 * already completed but its lead still says Inspection Scheduled. It is safe
 * to call repeatedly: drafts and later workflow stages are never changed.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const access = await authorizeInspectionLead(params.id, "write");
  if (!access.ok) return fail(access.message, access.status);

  const { data: report, error: reportError } = await access.supabase
    .from("inspection_reports")
    .select("status")
    .eq("lead_id", params.id)
    .maybeSingle();
  if (reportError) return fail(reportError.message, 500);
  if (report?.status !== "completed") return NextResponse.json({ ok: true, data: { reconciled: false } });

  const { data: lead, error: leadError } = await access.supabase
    .from("leads")
    .select("status")
    .eq("id", params.id)
    .single();
  if (leadError || !lead) return fail(leadError?.message ?? "Lead not found.", 404);

  if (lead.status !== "inspection_scheduled") return NextResponse.json({ ok: true, data: { reconciled: false } });

  const { error: updateError } = await access.supabase
    .from("leads")
    .update({ status: "inspected" })
    .eq("id", params.id)
    .eq("status", "inspection_scheduled");
  if (updateError) return fail(updateError.message, 500);

  return NextResponse.json({ ok: true, data: { reconciled: true } });
}
