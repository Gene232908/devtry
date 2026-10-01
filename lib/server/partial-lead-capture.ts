const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Accepts only a canonical UUID session id. It is an idempotency key, not an
 * authorization token; all capture data is still validated independently.
 */
export function parseCaptureSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function parseCaptureRevision(value: unknown): number | null {
  if (value === undefined) return 0;
  const normalized = typeof value === "string" ? value.trim() : value;
  if (typeof normalized !== "number" && typeof normalized !== "string") return null;
  if (typeof normalized === "string" && !/^\d+$/.test(normalized)) return null;
  const revision = Number(normalized);
  return Number.isInteger(revision) && revision >= 0 && revision <= 1_000_000 ? revision : null;
}

export function canRetryLegacyCapture(errorMessage: string, inquiryType: "valuation" | "scrap"): boolean {
  if (/p_capture_session_id|p_capture_revision/i.test(errorMessage)) return true;
  return inquiryType === "valuation"
    && /p_inquiry_type|p_scrap_condition|p_scrap_asking_price_aed|p_mileage_value|p_mileage_unit|capture_partial_lead/i.test(errorMessage);
}

