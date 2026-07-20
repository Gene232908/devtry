import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DbSettings = {
  whatsapp_number: string | null;
  call_number: string | null;
  notify_email: string | null;
  buy_a_car_enabled: boolean;
  visible_stats: string[] | null;
};

function mapSettings(row: DbSettings) {
  return {
    whatsappNumber: row.whatsapp_number ?? "",
    callNumber: row.call_number ?? "",
    notifyEmail: row.notify_email ?? "",
    buyACarEnabled: row.buy_a_car_enabled,
    visibleStats: row.visible_stats ?? [],
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const [settingsRes, profilesRes] = await Promise.all([
    supabase.from("settings").select("whatsapp_number, call_number, notify_email, buy_a_car_enabled, visible_stats").eq("id", 1).single(),
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

  let body: {
    whatsappNumber?: unknown;
    callNumber?: unknown;
    notifyEmail?: unknown;
    buyACarEnabled?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid request." } }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.whatsappNumber === "string") update.whatsapp_number = body.whatsappNumber.trim();
  if (typeof body.callNumber === "string") update.call_number = body.callNumber.trim();
  if (typeof body.notifyEmail === "string") update.notify_email = body.notifyEmail.trim();
  if (typeof body.buyACarEnabled === "boolean") update.buy_a_car_enabled = body.buyACarEnabled;

  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .update(update)
    .eq("id", 1)
    .select("whatsapp_number, call_number, notify_email, buy_a_car_enabled, visible_stats")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { settings: mapSettings(data as DbSettings) } });
}
