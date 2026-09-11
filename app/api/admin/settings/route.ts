import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/require-admin";
import { fieldErrors, settingsSchema } from "@/lib/admin/settings-schema";

export const dynamic = "force-dynamic";

type DbSettings = {
  whatsapp_number: string | null;
  call_number: string | null;
  notify_email: string | null;
  visible_stats: string[] | null;
};

// `buy_a_car_enabled` is intentionally not selected or written. Nothing reads
// it — the public "Buy a Car — Coming Soon" button is hard-coded — so offering
// it as a setting promised an effect it did not have. The column stays in the
// database for the marketplace it was planned for. See lib/admin/settings-schema.ts.
const SETTINGS_COLUMNS = "whatsapp_number, call_number, notify_email, visible_stats";

function mapSettings(row: DbSettings) {
  return {
    whatsappNumber: row.whatsapp_number ?? "",
    callNumber: row.call_number ?? "",
    notifyEmail: row.notify_email ?? "",
    visibleStats: row.visible_stats ?? [],
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  // This route reads with service-role access, so it must enforce the same
  // owner-only boundary as the Settings page rather than relying on RLS.
  const supabase = getSupabaseAdmin();
  const [settingsRes, profilesRes] = await Promise.all([
    supabase.from("settings").select(SETTINGS_COLUMNS).eq("id", 1).single(),
    supabase.from("profiles").select("id, email, role, display_name").order("created_at", { ascending: true }),
  ]);

  if (settingsRes.error) {
    return NextResponse.json({ ok: false, error: { message: settingsRes.error.message } }, { status: 500 });
  }

  const managers = (profilesRes.data ?? []).map((p) => ({
    id: p.id as string,
    email: (p.email as string | null) ?? "",
    role: p.role as string,
    displayName: (p.display_name as string | null) ?? undefined,
  }));

  return NextResponse.json({
    ok: true,
    data: { settings: mapSettings(settingsRes.data as DbSettings), managers },
  });
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  // RLS makes settings admin-write (settings_admin_write), but this route works
  // through the service-role client, which bypasses RLS. Without this check a
  // signed-in MANAGER could write settings the policy exists to deny them.
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  // Validated server-side, not merely in the form: the route is reachable
  // directly, so the client's checks are a convenience and this is the rule.
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: "Please correct the highlighted fields.", fields: fieldErrors(parsed.error) },
      },
      { status: 400 },
    );
  }

  const { whatsappNumber, callNumber, notifyEmail } = parsed.data;

  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .update({
      whatsapp_number: whatsappNumber,
      call_number: callNumber,
      notify_email: notifyEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select(SETTINGS_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  // Returns the row as stored, so the form adopts what the database actually
  // holds rather than assuming its own values were taken verbatim.
  return NextResponse.json({ ok: true, data: { settings: mapSettings(data as DbSettings) } });
}
