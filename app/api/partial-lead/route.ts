import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/whatsapp/otp-hash";
import { getClientIp } from "@/lib/server/ip";
import { isRateLimited } from "@/lib/rate-limit";
import { hasOpenLead } from "@/lib/server/enquiry";
import { pickNextAssignee } from "@/lib/server/lead-assignment";
import { canRetryLegacyCapture, parseCaptureRevision, parseCaptureSessionId } from "@/lib/server/partial-lead-capture";

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
const CAPTURE_TRIGGERS = new Set(["close", "consent", "next", "input"]);
const MILES_TO_KM = 1.609344;

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
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function mileageFromBody(body: Record<string, unknown>) {
  const value = int(body.mileageKm);
  const unit = body.mileageUnit === "miles" ? "miles" : "km";
  if (value === null || value > 1_000_000) return null;
  return { value, unit, km: unit === "miles" ? Math.round(value * MILES_TO_KM) : value } as const;
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
  const captureSessionId = parseCaptureSessionId(body.captureSessionId);
  if (body.captureSessionId !== undefined && !captureSessionId) return ok(false);
  const captureRevision = parseCaptureRevision(body.captureRevision);
  if (captureRevision === null) return ok(false);

  const ip = getClientIp(req);
  if (ip && isRateLimited(`partial-lead:${ip}`, MAX_CAPTURES_PER_IP, CAPTURE_WINDOW_MS)) {
    return ok(false);
  }

  // A number that is ALREADY an open lead is not captured as incomplete.
  //
  // partial_leads is temporary storage on the way to `leads`. Once someone has
  // verified their number and submitted the form, the lead is the real record —
  // and a row for that same person sitting on Incomplete Forms is a duplicate
  // of it: the same name and number in two places, with nothing telling the
  // admin which one to act on. Worse, this endpoint fires on ordinary UI
  // actions, so simply closing the modal after submitting would put a finished
  // customer straight back onto the incomplete list.
  //
  // Only an OPEN lead blocks the capture. deal and closed are finished
  // conversations, so the same person starting a second valuation is a genuinely
  // new enquiry and must still be recorded if they abandon it — the same rule
  // the OTP gate applies, from the same shared helper.
  const step = int(body.furthestStep) ?? 1;
  const mileage = mileageFromBody(body);
  if (typeof body.trigger !== "string" || !CAPTURE_TRIGGERS.has(body.trigger)) return ok(false);
  if (body.inquiryType !== undefined && body.inquiryType !== "valuation" && body.inquiryType !== "scrap") return ok(false);
  const inquiryType = body.inquiryType === "scrap" ? "scrap" : "valuation";
  if (await hasOpenLead(getSupabaseAdmin(), phone, inquiryType)) return ok(false);
  const scrapCondition = str(body.scrapCondition);
  const scrapAskingPrice = body.scrapAskingPriceAed === undefined || body.scrapAskingPriceAed === ""
    ? null
    : Number(body.scrapAskingPriceAed);
  if (
    (scrapCondition !== null && scrapCondition.length > 400) ||
    (scrapAskingPrice !== null && (!Number.isFinite(scrapAskingPrice) || scrapAskingPrice < 0))
  ) return ok(false);
  // An incomplete form is a CSR recovery task first. It is intentionally not
  // handed to Purchasers until a CSR has confirmed the person and booked an
  // inspection, at which point it becomes a real lead.
  const callCenterId = await pickNextAssignee("call_center", "partial_leads");

  try {
    const legacyPayload = {
      p_phone: phone,
      p_full_name: str(body.fullName),
      p_furthest_step: Math.min(Math.max(step, 1), 3),
      p_consent: body.consent === true,
      p_trigger: body.trigger,
      p_ip_hash: hashIp(ip),
      p_make: str(body.make),
      p_model: str(body.model),
      p_year: int(body.year),
      p_mileage_km: mileage?.km ?? null,
      p_specification: str(body.specification),
      p_description: str(body.description),
      p_call_center_id: callCenterId,
    };
    const { error } = await getSupabaseAdmin().rpc("capture_partial_lead", {
      ...legacyPayload,
      p_mileage_value: mileage?.value ?? null,
      p_mileage_unit: mileage?.unit ?? "km",
      p_inquiry_type: inquiryType,
      p_scrap_condition: inquiryType === "scrap" ? scrapCondition : null,
      p_scrap_asking_price_aed: inquiryType === "scrap" ? scrapAskingPrice : null,
      p_capture_session_id: captureSessionId,
      p_capture_revision: captureRevision,
    });
    if (error) {
      // Deployment-order compatibility for migration 0041: the previous RPC
      // already understands both inquiry types, so only omit the two new
      // session arguments and retry. The older pre-0035 fallback remains
      // valuation-only because that schema cannot preserve Scrap provenance.
      if (!canRetryLegacyCapture(error.message ?? "", inquiryType)) return ok(false);
      const { error: legacyError } = await getSupabaseAdmin().rpc("capture_partial_lead", legacyPayload);
      if (legacyError) return ok(false);
    }
  } catch {
    // Swallowed on purpose: an abandoned-form capture must never turn into a
    // visible failure for someone who is simply closing the modal.
    return ok(false);
  }

  return ok(true);
}
