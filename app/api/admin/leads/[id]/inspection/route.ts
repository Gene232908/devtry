import { NextRequest, NextResponse } from "next/server";
import { authorizeInspectionLead } from "@/lib/inspection/access";
import { EMPTY_INSPECTION_REPORT, inspectionDraftSchema, inspectionReportSchema, isCompleteInspectionReport, normalizeInspectionDraft } from "@/lib/inspection/report-schema";
import { inspectionChangedCards } from "@/lib/inspection/audit";

export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

function isMissingInspectionNoteColumn(error: { message?: string } | null) {
  return Boolean(error?.message && /column .*inspection_photos\.note|inspection_photos\.note.*does not exist/i.test(error.message));
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const access = await authorizeInspectionLead(resolvedParams.id, "read");
  if (!access.ok) return fail(access.message, access.status);

  const { data: report, error } = await access.supabase
    .from("inspection_reports")
    .select("id, report_data, status, completed_at, updated_at")
    .eq("lead_id", resolvedParams.id)
    .maybeSingle();
  if (error) return fail(error.message, 500);

  let legacyPhotoSchema = false;
  let photoRows: { data: Array<{ angle: string; storage_path: string; note?: string | null; created_at: string }> | null; error: { message?: string } | null };
  if (!report) {
    photoRows = { data: [], error: null };
  } else {
    const currentPhotoRows = await access.supabase.from("inspection_photos").select("angle, storage_path, note, created_at").eq("inspection_report_id", report.id);
    if (isMissingInspectionNoteColumn(currentPhotoRows.error)) {
      legacyPhotoSchema = true;
      photoRows = await access.supabase.from("inspection_photos").select("angle, storage_path, created_at").eq("inspection_report_id", report.id) as typeof photoRows;
    } else {
      photoRows = currentPhotoRows;
    }
  }
  if (photoRows.error) return fail(photoRows.error.message ?? "Couldn't load inspection photos.", 500);

  const parsedReport = report ? inspectionDraftSchema.safeParse(normalizeInspectionDraft(report.report_data)) : null;
  if (report && !parsedReport?.success) return fail("This inspection draft has invalid saved data. Please contact an administrator.", 409);

  return NextResponse.json({
    ok: true,
    data: {
      lead: access.lead,
      report: report
        ? { id: report.id, data: parsedReport!.data, status: report.status, completedAt: report.completed_at, updatedAt: report.updated_at }
        : { id: null, data: EMPTY_INSPECTION_REPORT, status: "draft", completedAt: null, updatedAt: null },
      photos: (photoRows.data ?? []).map((photo: { angle: string; note?: string | null; created_at: string }) => ({
        angle: photo.angle,
        note: photo.note ?? (legacyPhotoSchema ? "Legacy photo. Add a note when replacing this image after migration 0028." : ""),
        url: `/api/admin/leads/${encodeURIComponent(resolvedParams.id)}/inspection/photos/${encodeURIComponent(photo.angle)}`,
        createdAt: photo.created_at,
      })),
    },
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const access = await authorizeInspectionLead(resolvedParams.id, "write");
  if (!access.ok) return fail(access.message, access.status);
  const body = await request.json().catch(() => null) as { report?: unknown; complete?: unknown } | null;
  const complete = body?.complete === true;
  const parsedDraft = inspectionDraftSchema.safeParse(normalizeInspectionDraft(body?.report));
  if (!parsedDraft.success) return fail("Check the inspection report fields and try again.", 400);
  const { data: existing, error: existingError } = await access.supabase
    .from("inspection_reports")
    .select("id, status, report_data")
    .eq("lead_id", resolvedParams.id)
    .maybeSingle();
  if (existingError) return fail(existingError.message, 500);
  const mustBeComplete = complete || existing?.status === "completed";
  const parsed = mustBeComplete ? inspectionReportSchema.safeParse(parsedDraft.data) : { success: true as const, data: parsedDraft.data };
  if (!parsed.success) return fail("Complete the required formats before finishing the inspection.", 400);

  const changedCards = inspectionChangedCards((existing?.report_data ?? {}) as Partial<typeof parsed.data>, parsed.data);
  const saved = await access.supabase.rpc("save_inspection_report", {
    p_lead_id: resolvedParams.id,
    p_report_data: parsed.data,
    p_actor: access.auth.userId,
    p_actor_name: access.auth.displayName,
    p_actor_role: access.auth.role,
    p_changed_cards: changedCards,
  });
  if (saved.error || !saved.data) return fail(saved.error?.message ?? "Couldn't save the inspection report.", 500);
  const report = { id: String(saved.data) };

  if (!complete) {
    return NextResponse.json({ ok: true, data: { id: report.id, status: existing?.status ?? "draft" } });
  }

  if (existing?.status !== "completed") {
    const { data: photos, error: photosError } = await access.supabase.from("inspection_photos").select("angle, note").eq("inspection_report_id", report.id);
    if (photosError) return fail(photosError.message, 500);
    const documentedPhotos = (photos ?? []).filter((photo: { angle: string; note: string | null }) => photo.note?.trim()).map((photo: { angle: string }) => photo.angle);
    if (!isCompleteInspectionReport(parsed.data, documentedPhotos)) {
      return fail("Complete the vehicle details, every condition check, tyre year and failure note, and all 24 photos with notes before saving the inspection.", 400);
    }

    const { error: completeError } = await access.supabase.rpc("complete_inspection_report", {
      p_report_id: report.id,
      p_lead_id: resolvedParams.id,
      p_actor: access.auth.userId,
      p_actor_name: access.auth.displayName,
      p_actor_role: access.auth.role,
    });
    if (completeError) return fail(completeError.message, 409);
  }

  // Reconcile the lead stage after the completion RPC. The RPC normally makes
  // this update atomically, but the guarded fallback keeps an older deployed
  // function version from reporting success while the lead still looks
  // Inspection Scheduled in the Leads store.
  const { error: statusError } = await access.supabase
    .from("leads")
    .update({ status: "inspected" })
    .eq("id", resolvedParams.id)
    .eq("status", "inspection_scheduled");
  if (statusError) return fail(statusError.message, 500);

  const { data: verifiedLead, error: verifiedLeadError } = await access.supabase
    .from("leads")
    .select("status")
    .eq("id", resolvedParams.id)
    .single();
  if (verifiedLeadError || !["inspected", "negotiating", "deal", "closed"].includes(verifiedLead?.status ?? "")) {
    return fail("The inspection was saved, but the lead status could not be updated to Inspected. Please refresh and try again.", 409);
  }
  return NextResponse.json({ ok: true, data: { id: report.id, status: "completed" } });
}
