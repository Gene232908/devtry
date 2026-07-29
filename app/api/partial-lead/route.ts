import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/whatsapp/otp-hash";
import { getClientIp } from "@/lib/server/ip";
import { isRateLimited } from "@/lib/rate-limit";

// Captures a valuation form that was started but never submitted, so a visitor
// who types their name and number and then leaves is still reachable.
//
// This fires on ordinary UI actions (closing the modal, ticking consent,
// pressing Next), so it is built to be cheap and unobtrusive:
//   * exactly one database round trip — an atomic upsert RPC, no read first
//   * never blocks or fails the UI: every outcome returns 200, so the client
//     has nothing to retry and no error to surface
//   * the client only calls it when the captured details actually changed
//
// It is deliberately NOT under /api/admin (that prefix requires an admin
// session in middleware.ts). It is public by necessity, which is why it writes
// through a single fixed RPC rather than accepting arbitrary columns.

// Best-effort burst guard. In-memory, so it resets on cold starts — that is
// acceptable here because the write is an idempotent upsert keyed on the phone
// number, so repeats cost one cheap statement and can never create duplicates.
const MAX_CAPTURES_PER_IP = 30;
const CAPTURE_WINDOW_MS = 10 * 60 * 1000;

/** Always 200 — the client treats this endpoint as fire-and-forget. */
function ok(captured: boolean) {
  return NextResponse.json({ ok: true, data: { captured } });
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Parses a positive integer, returning null for anything unusable. */
function int(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return ok(false);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ok(false);
  }

  // Honeypot — a real visitor never fills this hidden field.
  if (typeof body.honeypot === "string" && body.honeypot.trim().length > 0) return ok(false);

  // A partial lead exists to be called back, so a usable phone number is the
  // one hard requirement: it is also the dedupe key. Anything else is optional.
  const phone = typeof body.whatsapp === "string" ? normalizeWhatsappPhone(body.whatsapp) : null;
  if (!phone) return ok(false);

  const ip = getClientIp(req);
  if (ip && isRateLimited(`partial-lead:${ip}`, MAX_CAPTURES_PER_IP, CAPTURE_WINDOW_MS)) {
    return ok(false);
  }

  const step = int(body.furthestStep) ?? 1;

  try {
    const { error } = await getSupabaseAdmin().rpc("capture_partial_lead", {
      p_phone: phone,
      p_full_name: str(body.fullName),
      p_furthest_step: Math.min(Math.max(step, 1), 3),
      p_consent: body.consent === true,
      p_trigger: str(body.trigger),
      p_ip_hash: hashIp(ip),
      p_make: str(body.make),
      p_model: str(body.model),
      p_year: int(body.year),
      p_mileage_km: int(body.mileageKm),
      p_description: str(body.description),
    });
    if (error) return ok(false);
  } catch {
    // Swallowed on purpose: an abandoned-form capture must never turn into a
    // visible failure for someone who is simply closing the modal.
    return ok(false);
  }

  return ok(true);
}
