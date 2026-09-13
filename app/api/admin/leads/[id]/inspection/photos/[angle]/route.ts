import { NextRequest, NextResponse } from "next/server";
import { authorizeInspectionLead } from "@/lib/inspection/access";
import { PHOTO_ANGLES } from "@/lib/inspection/report-schema";

export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string; angle: string } }) {
  const access = await authorizeInspectionLead(params.id, "read");
  if (!access.ok) return fail(access.message, access.status);

  const angle = params.angle;
  if (!PHOTO_ANGLES.includes(angle as (typeof PHOTO_ANGLES)[number])) return fail("Unknown inspection photo.", 404);

  const { data: report, error: reportError } = await access.supabase
    .from("inspection_reports")
    .select("id")
    .eq("lead_id", params.id)
    .maybeSingle();
  if (reportError) return fail(reportError.message, 500);
  if (!report) return fail("Inspection photo not found.", 404);

  const { data: photo, error: photoError } = await access.supabase
    .from("inspection_photos")
    .select("storage_path, content_type")
    .eq("inspection_report_id", report.id)
    .eq("angle", angle)
    .maybeSingle();
  if (photoError) return fail(photoError.message, 500);
  if (!photo) return fail("Inspection photo not found.", 404);

  const downloaded = await access.supabase.storage.from("inspection-photos").download(photo.storage_path);
  if (downloaded.error) return fail("Inspection photo is temporarily unavailable.", 502);
  return new NextResponse(downloaded.data, {
    headers: {
      "Content-Type": photo.content_type,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  });
}
