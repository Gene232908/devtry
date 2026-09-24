// Shared shape and labels for incomplete valuation forms.
//
// These are NOT leads. Nobody verified the phone number, so they are kept in a
// separate table, a separate page, and out of the leads pipeline entirely — the
// only thing they have in common with a lead is that a person can be called.

export type PartialLead = {
  id: string;
  created_at: string;
  updated_at: string;
  phone_e164: string;
  full_name: string | null;
  consent: boolean;
  status: string;
  notes: string;
  furthest_step: number;
  last_trigger: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage_km: number | null;
  specification?: string | null;
  description: string | null;
  inquiry_type?: "valuation" | "scrap" | null;
  scrap_condition?: string | null;
  scrap_asking_price_aed?: number | string | null;
  call_center_id: string | null;
  purchaser_id: string | null;
  activities?: PartialLeadActivity[];
};

export type PartialLeadActivity = {
  id: string;
  type: "note_updated" | "status_changed" | "assigned";
  meta: { from?: string; to?: string };
  created_at: string;
};

/** Columns selected everywhere a partial lead is read, kept in one place so the
 *  list and detail endpoints can never drift apart. */
export const PARTIAL_LEAD_COLUMNS =
  "id, created_at, updated_at, phone_e164, full_name, consent, status, notes, furthest_step, last_trigger, make, model, year, mileage_km, specification, description, inquiry_type, scrap_condition, scrap_asking_price_aed, call_center_id, purchaser_id";

export const PARTIAL_LEAD_COLUMNS_LEGACY =
  "id, created_at, updated_at, phone_e164, full_name, consent, status, notes, furthest_step, last_trigger, make, model, year, mileage_km, specification, description, call_center_id, purchaser_id";

export function partialInquiryType(row: Pick<PartialLead, "inquiry_type">): "valuation" | "scrap" {
  return row.inquiry_type === "scrap" ? "scrap" : "valuation";
}

/**
 * Deliberately the same vocabulary as the lead pipeline. An abandoned form can
 * still be contacted, the car still inspected, and it can still end in a deal —
 * two different status lists would make the two screens read as if they
 * described different processes.
 *
 * Every state is selectable, including moving back to 'new'.
 *
 * This used to offer forward moves only, on the reasoning that a record could
 * not honestly go back to "nobody has looked at this". That reasoning depended
 * on 'pending' being reached AUTOMATICALLY when the record was opened — so the
 * status was a fact about the system, not a judgement, and reversing it would
 * have been a lie.
 *
 * Opening a record no longer changes anything, so the status is now entirely a
 * human judgement about where the conversation stands. A judgement made by
 * mistake has to be reversible, which means 'new' has to be offered.
 */
export const PARTIAL_STATUSES = ["new", "contacted", "inspection_scheduled"] as const;

/** Everything the database will accept. Identical to the selectable list. */
export const PARTIAL_STATUSES_ALLOWED = PARTIAL_STATUSES;

export const PARTIAL_STEP_LABELS: Record<number, string> = {
  1: "Contact only",
  2: "Reached car details",
  3: "Reached trim & location",
};

export const PARTIAL_TRIGGER_LABELS: Record<string, string> = {
  close: "Closed the form",
  consent: "Ticked consent",
  next: "Pressed Next",
  input: "Entered details",
};

export function partialCarSummary(row: Pick<PartialLead, "year" | "make" | "model">): string {
  const parts = [row.year, row.make, row.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

// Date only, and anchored to Asia/Dubai rather than the viewer's clock — the
// business runs on UAE time, so a capture made late in the UAE evening must not
// read as the following day (or the previous one) depending on who is looking.
export { formatUaeDateShort as formatPartialDate } from "@/lib/uae-time";
