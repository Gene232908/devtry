import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const RETENTION_DAYS = 60;
// At 24 photos per report this keeps one storage deletion below 500 objects.
const BATCH_SIZE = 20;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: { message: "Retention job is not configured." } }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: { message: "Unauthorized." } }, { status: 401 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const supabase = getSupabaseAdmin();
  const reports = await supabase.rpc("inspection_reports_due_for_photo_purge", { p_cutoff: cutoff, p_limit: BATCH_SIZE });
  if (reports.error) return NextResponse.json({ ok: false, error: { message: reports.error.message } }, { status: 500 });
  const reportIds = (reports.data ?? []).map((row: { report_id: string }) => row.report_id);
  if (!reportIds.length) return NextResponse.json({ ok: true, data: { removed: 0 } });

  const photos = await supabase.from("inspection_photos").select("id, inspection_report_id, storage_path").in("inspection_report_id", reportIds);
  if (photos.error) return NextResponse.json({ ok: false, error: { message: photos.error.message } }, { status: 500 });
  if (photos.data?.length) {
    const storageRemoval = await supabase.storage.from("inspection-photos").remove(photos.data.map((photo: { storage_path: string }) => photo.storage_path));
    if (storageRemoval.error) return NextResponse.json({ ok: false, error: { message: storageRemoval.error.message } }, { status: 500 });
    const rowRemoval = await supabase.from("inspection_photos").delete().in("id", photos.data.map((photo: { id: string }) => photo.id));
    if (rowRemoval.error) return NextResponse.json({ ok: false, error: { message: rowRemoval.error.message } }, { status: 500 });
  }
  const purgeStamp = await supabase.from("inspection_reports").update({ photos_purged_at: new Date().toISOString() }).in("id", reportIds);
  if (purgeStamp.error) return NextResponse.json({ ok: false, error: { message: purgeStamp.error.message } }, { status: 500 });

  return NextResponse.json({ ok: true, data: { removed: photos.data?.length ?? 0, affectedLeads: reportIds.length } });
}
