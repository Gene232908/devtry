import { NextRequest, NextResponse } from "next/server";
import { authorizeInspectionLead } from "@/lib/inspection/access";
import { PHOTO_ANGLES } from "@/lib/inspection/report-schema";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const access = await authorizeInspectionLead(resolvedParams.id, "write");
  if (!access.ok) return fail(access.message, access.status);

  const form = await request.formData().catch(() => null);
  const angle = typeof form?.get("angle") === "string" ? String(form.get("angle")) : "";
  const note = typeof form?.get("note") === "string" ? String(form.get("note")).trim() : "";
  const file = form?.get("file");
  if (!PHOTO_ANGLES.includes(angle as (typeof PHOTO_ANGLES)[number])) return fail("Invalid required photo angle.", 400);
  if (!note || note.length > 600) return fail("Add a photo note between 1 and 600 characters.", 400);
  if (!(file instanceof File) || file.size === 0) return fail("Choose a photo to upload.", 400);
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES) return fail("Use a JPG or PNG photo up to 8 MB.", 400);

  let { data: report, error: reportError } = await access.supabase
    .from("inspection_reports")
    .select("id, status")
    .eq("lead_id", resolvedParams.id)
    .maybeSingle();
  if (reportError) return fail(reportError.message, 500);
  if (!report) {
    const created = await access.supabase
      .from("inspection_reports")
      .insert({ lead_id: resolvedParams.id, created_by: access.auth.userId, updated_by: access.auth.userId })
      .select("id, status")
      .single();
    report = created.data;
    reportError = created.error;
  }
  if (reportError || !report) return fail(reportError?.message ?? "Couldn't start the inspection report.", 500);
  const { data: existingPhoto, error: existingPhotoError } = await access.supabase
    .from("inspection_photos")
    .select("id")
    .eq("inspection_report_id", report.id)
    .eq("angle", angle)
    .maybeSingle();
  if (existingPhotoError) return fail(existingPhotoError.message, 500);

  const extension = file.type === "image/png" ? "png" : "jpg";
  const safeAngle = angle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const path = `${resolvedParams.id}/${safeAngle}.${extension}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await access.supabase.storage.from("inspection-photos").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
    cacheControl: "31536000",
  });
  if (uploadError) return fail(uploadError.message, 500);

  const saved = await access.supabase.rpc("save_inspection_photo", {
    p_report_id: report.id,
    p_lead_id: resolvedParams.id,
    p_angle: angle,
    p_storage_path: path,
    p_content_type: file.type,
    p_size_bytes: file.size,
    p_note: note,
    p_actor: access.auth.userId,
    p_actor_name: access.auth.displayName,
    p_actor_role: access.auth.role,
  });
  if (saved.error) {
    if (!existingPhoto) await access.supabase.storage.from("inspection-photos").remove([path]);
    return fail(saved.error.message, 500);
  }

  return NextResponse.json({
    ok: true,
    data: { angle, note, url: `/api/admin/leads/${encodeURIComponent(resolvedParams.id)}/inspection/photos/${encodeURIComponent(angle)}?v=${Date.now()}` },
  });
}
