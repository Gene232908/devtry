import { authorizeInspectionLead } from "@/lib/inspection/access";
import { buildInspectionPdf, type InspectionPdfPhoto } from "@/lib/inspection/pdf-report";
import { inspectionReportFilename } from "@/lib/inspection/report-filename";
import { inspectionReportSchema, PHOTO_ANGLES } from "@/lib/inspection/report-schema";

export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return Response.json({ ok: false, error: { message } }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const access = await authorizeInspectionLead(resolvedParams.id, "read");
  if (!access.ok) return fail(access.message, access.status);

  const { data: report, error } = await access.supabase
    .from("inspection_reports")
    .select("id, report_data, completed_at, updated_by, photos_purged_at")
    .eq("lead_id", resolvedParams.id)
    .eq("status", "completed")
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!report) return fail("Complete the inspection before downloading its report.", 409);

  const parsedReport = inspectionReportSchema.safeParse(report.report_data);
  if (!parsedReport.success) return fail("The saved inspection report contains invalid data and cannot be exported yet.", 422);
  const data = parsedReport.data;

  const [{ data: photos, error: photosError }, inspectorResult] = await Promise.all([
    access.supabase
      .from("inspection_photos")
      .select("angle, storage_path, content_type, note")
      .eq("inspection_report_id", report.id),
    report.updated_by
      ? access.supabase.from("profiles").select("display_name").eq("id", report.updated_by).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (photosError) return fail(photosError.message, 500);

  const photoByAngle = new Map((photos ?? []).map((photo: { angle: string; storage_path: string; content_type: string; note: string }) => [photo.angle, photo]));
  if (!report.photos_purged_at && !PHOTO_ANGLES.every((angle) => photoByAngle.has(angle))) return fail("The completed report is missing a required photo.", 409);

  const downloadedPhotos: InspectionPdfPhoto[] = [];
  const availableAngles = PHOTO_ANGLES.filter((angle) => photoByAngle.has(angle));
  for (let start = 0; start < availableAngles.length; start += 4) {
    const batch = await Promise.all(availableAngles.slice(start, start + 4).map(async (angle) => {
      const photo = photoByAngle.get(angle) as { storage_path: string; content_type: string; note: string };
      const downloaded = await access.supabase.storage.from("inspection-photos").download(photo.storage_path);
      if (downloaded.error) throw new Error(`Couldn't retrieve ${angle}.`);
      return { angle, note: photo.note === "Good condition." ? "" : photo.note, contentType: photo.content_type, bytes: await downloaded.data.arrayBuffer() };
    })).catch((reason: unknown) => reason instanceof Error ? reason : new Error("Couldn't retrieve a required inspection photo."));
    if (batch instanceof Error) return fail(batch.message, 500);
    downloadedPhotos.push(...batch);
  }

  let generated: Uint8Array;
  try {
    generated = await buildInspectionPdf({
      data,
      completedAt: report.completed_at,
      inspectorName: inspectorResult.data?.display_name ?? null,
      photosExpired: Boolean(report.photos_purged_at),
      photos: downloadedPhotos,
    });
  } catch (reason) {
    return fail(reason instanceof Error ? reason.message : "The inspection report could not be generated.", 422);
  }
  const output = Uint8Array.from(generated);
  const signature = output.length >= 5 ? String.fromCharCode(output[0], output[1], output[2], output[3], output[4]) : "";
  if (signature !== "%PDF-") return fail("The inspection report could not be encoded as a valid PDF.", 500);

  const filename = inspectionReportFilename(data);
  const body = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
  const internalDelivery = new URL(request.url).searchParams.get("delivery") === "internal";
  const headers: Record<string, string> = {
    "Content-Type": internalDelivery ? "application/octet-stream" : "application/pdf",
    "Content-Length": String(output.byteLength),
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-CarVibe-Payload": "inspection-pdf",
    "X-CarVibe-Filename": encodeURIComponent(filename),
  };
  if (!internalDelivery) headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  return new Response(body, { headers });
}
