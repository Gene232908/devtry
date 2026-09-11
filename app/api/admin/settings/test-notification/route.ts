import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { sendLeadNotificationTest, verifyLeadNotificationTransport } from "@/lib/server/lead-notifications";
import { requireAdmin } from "@/lib/server/require-admin";

/** Owner-only proof that the saved Settings recipient can receive lead email. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: { message: auth.message } }, { status: auth.status });
  }

  const { data: settings, error } = await getSupabaseAdmin()
    .from("settings")
    .select("notify_email")
    .eq("id", 1)
    .single();
  const recipient = typeof settings?.notify_email === "string" ? settings.notify_email.trim() : "";

  if (error || !recipient) {
    return NextResponse.json(
      { ok: false, error: { message: "Save a valid Notify email in Settings before sending a test." } },
      { status: 400 },
    );
  }

  try {
    await verifyLeadNotificationTransport();
    await sendLeadNotificationTest(recipient);
    return NextResponse.json({ ok: true });
  } catch (sendError) {
    console.error("[POST /api/admin/settings/test-notification] Email test failed:", sendError instanceof Error ? sendError.message : "unknown error");
    return NextResponse.json(
      { ok: false, error: { message: "Could not send the test email. Check the server email configuration and try again." } },
      { status: 502 },
    );
  }
}
