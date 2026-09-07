import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";
import { fetchBlockedNumbers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/server/require-admin";

// Admin-only (gated by middleware.ts). Manages the hard blocklist that
// /api/otp/send checks before sending anything, so a blocked number can never
// cost another billed WhatsApp message.

export const dynamic = "force-dynamic";

const REASONS = new Set(["manual_spam", "otp_abuse"]);

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

// The read lives in lib/admin/queries.ts so the Blocked Numbers page can run it
// during its own server render instead of loading empty and calling this route
// over HTTP. Unchanged for callers; still the path used by Refresh and by every
// block/unblock action that reloads the list afterwards.
export async function GET() {
  const result = await fetchBlockedNumbers();
  if (!result.ok) return bad(result.message, result.status);

  return NextResponse.json({ ok: true, data: result.data });
}

export async function POST(req: NextRequest) {
  // Blocking/unblocking numbers is an owner-only action.
  const auth = await requireAdmin();
  if (!auth.ok) return bad(auth.message, auth.status);

  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return bad("Database is not configured.", 503);

  let body: { phone?: unknown; reason?: unknown; note?: unknown; fullName?: unknown; sourceLeadId?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const phone = typeof body.phone === "string" ? normalizeWhatsappPhone(body.phone) : null;
  if (!phone) return bad("Enter a valid mobile number.");

  const reason = typeof body.reason === "string" && REASONS.has(body.reason) ? body.reason : "manual_spam";

  // Upsert so blocking an already-blocked number is a no-op rather than a
  // primary-key error — the admin can press the button twice safely.
  const { error } = await getSupabaseAdmin()
    .from("blocked_numbers")
    .upsert(
      {
        phone_e164: phone,
        reason,
        note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
        full_name: typeof body.fullName === "string" && body.fullName.trim() ? body.fullName.trim() : null,
        source_lead_id: typeof body.sourceLeadId === "string" && body.sourceLeadId ? body.sourceLeadId : null,
      },
      { onConflict: "phone_e164" },
    );

  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true, data: { phone_e164: phone, reason } });
}

/** Unblocks a number — the recovery path for a customer blocked by mistake. */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return bad(auth.message, auth.status);

  const blocked = blockedByPreview();
  if (blocked) return blocked;

  if (!isSupabaseConfigured()) return bad("Database is not configured.", 503);

  let body: { phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const phone = typeof body.phone === "string" ? normalizeWhatsappPhone(body.phone) : null;
  if (!phone) return bad("Enter a valid mobile number.");

  const { error } = await getSupabaseAdmin().from("blocked_numbers").delete().eq("phone_e164", phone);
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true, data: { phone_e164: phone } });
}
