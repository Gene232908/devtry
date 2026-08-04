import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { blockedByPreview } from "@/lib/admin/preview-guard";

// Admin-only (gated by middleware.ts). Manages the hard blocklist that
// /api/otp/send checks before sending anything, so a blocked number can never
// cost another billed WhatsApp message.

export const dynamic = "force-dynamic";

const REASONS = new Set(["manual_spam", "otp_abuse"]);

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Database is not configured.", 503);

  const supabase = getSupabaseAdmin();

  const { data: blocked, error } = await supabase
    .from("blocked_numbers")
    .select("phone_e164, reason, note, full_name, source_lead_id, created_at")
    .order("created_at", { ascending: false });

  if (error) return bad(error.message, 500);

  // Numbers that tripped an automated OTP guard in the last 24h but have NOT
  // been permanently blocked. Surfaced separately and never auto-added: a real
  // customer can hit a cap by accident, so promoting to the blocklist stays a
  // deliberate admin action.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let recentSuspicious: Array<{ phone_e164: string; attempts: number; last_attempt: string }> = [];

  try {
    const { data: recent } = await supabase
      .from("whatsapp_otp_verifications")
      .select("phone_number, created_at, verified_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (recent) {
      const blockedSet = new Set((blocked ?? []).map((b) => b.phone_e164));
      const byPhone = new Map<string, { attempts: number; verified: number; last: string }>();

      for (const row of recent as Array<{ phone_number: string; created_at: string; verified_at: string | null }>) {
        const entry = byPhone.get(row.phone_number) ?? { attempts: 0, verified: 0, last: row.created_at };
        entry.attempts += 1;
        if (row.verified_at) entry.verified += 1;
        if (row.created_at > entry.last) entry.last = row.created_at;
        byPhone.set(row.phone_number, entry);
      }

      recentSuspicious = Array.from(byPhone.entries())
        // Three or more requests with nothing ever verified is the same signal
        // the send-side guard uses (OTP_UNVERIFIED_STREAK_CAP).
        .filter(([phone, e]) => e.verified === 0 && e.attempts >= 3 && !blockedSet.has(phone))
        .map(([phone, e]) => ({ phone_e164: phone, attempts: e.attempts, last_attempt: e.last }))
        .sort((a, b) => b.attempts - a.attempts);
    }
  } catch {
    // non-fatal — the blocklist itself still renders
  }

  return NextResponse.json({ ok: true, data: { blocked: blocked ?? [], recentSuspicious } });
}

export async function POST(req: NextRequest) {
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
