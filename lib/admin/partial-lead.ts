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
  description: string | null;
};

/** Columns selected everywhere a partial lead is read, kept in one place so the
 *  list and detail endpoints can never drift apart. */
export const PARTIAL_LEAD_COLUMNS =
  "id, created_at, updated_at, phone_e164, full_name, consent, status, notes, furthest_step, last_trigger, make, model, year, mileage_km, description";

/**
 * Deliberately the same vocabulary as the lead pipeline. An abandoned form can
 * still be contacted, the car still inspected, and it can still end in a deal —
 * two different status lists would make the two screens read as if they
 * described different processes.
 *
 * Only forward moves are offered. 'new' and 'pending' are both valid states in
 * the database — a capture starts on 'new' and becomes 'pending' the moment
 * someone opens it — but neither is selectable, because choosing them would
 * mean claiming a record had gone backwards to "not looked at yet".
 */
export const PARTIAL_STATUSES = ["contacted", "inspected", "deal", "closed"] as const;

/** Everything the database will accept, including the two states reached automatically. */
export const PARTIAL_STATUSES_ALLOWED = ["new", "pending", ...PARTIAL_STATUSES] as const;

export const PARTIAL_STEP_LABELS: Record<number, string> = {
  1: "Contact only",
  2: "Reached car details",
  3: "Reached trim & location",
};

export const PARTIAL_TRIGGER_LABELS: Record<string, string> = {
  close: "Closed the form",
  consent: "Ticked consent",
  next: "Pressed Next",
};

export function partialCarSummary(row: Pick<PartialLead, "year" | "make" | "model">): string {
  const parts = [row.year, row.make, row.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

// Date only, and anchored to Asia/Dubai rather than the viewer's clock — the
// business runs on UAE time, so a capture made late in the UAE evening must not
// read as the following day (or the previous one) depending on who is looking.
export { formatUaeDateShort as formatPartialDate } from "@/lib/uae-time";
