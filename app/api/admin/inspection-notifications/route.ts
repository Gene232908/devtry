import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/server/require-staff";

export const dynamic = "force-dynamic";

function canReceiveInspectionNotifications(role: string) {
  return role === "admin" || role === "manager" || role === "purchaser";
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  if (!canReceiveInspectionNotifications(auth.identity.role)) return NextResponse.json({ ok: true, data: { notifications: [], unreadCount: 0 } });

  const { data, error } = await getSupabaseAdmin()
    .from("inspection_schedule_notifications")
    .select("id, lead_id, lead_name, assigned_purchaser_name, previous_scheduled_at, scheduled_at, changed_by_name, created_at, read_at")
    .eq("recipient_id", auth.identity.userId)
    .order("created_at", { ascending: false })
    .limit(30);

  // Allows the rest of the deployment to run normally until migration 0033 is
  // applied; the bell simply stays absent of alerts rather than failing header
  // navigation for every staff member.
  if (error?.code === "42P01") return NextResponse.json({ ok: true, data: { notifications: [], unreadCount: 0, migrationRequired: true } });
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  const notifications = data ?? [];
  return NextResponse.json({ ok: true, data: { notifications, unreadCount: notifications.filter((item) => item.read_at === null).length } });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  if (!canReceiveInspectionNotifications(auth.identity.role)) return NextResponse.json({ ok: false, error: { message: "Not authorized." } }, { status: 403 });

  let body: { ids?: unknown } = {};
  try { body = await req.json(); } catch { /* Mark all is the safe default. */ }
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 30) : [];
  let update = getSupabaseAdmin()
    .from("inspection_schedule_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", auth.identity.userId)
    .is("read_at", null);
  if (ids.length > 0) update = update.in("id", ids);
  const { error } = await update;
  if (error?.code === "42P01") return NextResponse.json({ ok: true, data: { marked: 0, migrationRequired: true } });
  if (error) return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ ok: true, data: { marked: ids.length || "all" } });
}
