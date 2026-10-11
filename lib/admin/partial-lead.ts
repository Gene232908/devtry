// Shared shape and labels for incomplete valuation forms.
//
// These are NOT leads. Nobody verified the phone number, so they are kept in a
// separate table, a separate page, and out of the leads pipeline entirely — the
// only thing they have in common with a lead is that a person can be called.

export type PartialLead = {
  id: string;
  created_at: string;
  updated_at: string;
  viewed_at?: string | null;
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
  mileage_value?: number | null;
  mileage_unit?: "km" | "miles" | null;
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
  "id, created_at, updated_at, phone_e164, full_name, consent, status, notes, furthest_step, last_trigger, make, model, year, mileage_km, mileage_value, mileage_unit, specification, description, inquiry_type, scrap_condition, scrap_asking_price_aed, call_center_id, purchaser_id";

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

/**
 * Returns the count of new/unviewed incomplete forms for the sidebar notification badge.
 * Criteria:
 * - If viewed_at exists in PostgreSQL: count where viewed_at IS NULL and status != 'converted'.
 * - Fallback: count unconverted leads with status = 'new'.
 * Excludes converted leads and purchasers.
 */
export async function getUnviewedPartialLeadsCount(
  identity?: { role: string; userId: string },
  viewedIds: string[] = [],
): Promise<number> {
  if (identity?.role === "purchaser") return 0;
  try {
    const { getSupabaseAdmin, isSupabaseConfigured } = await import("@/lib/supabase/admin");
    if (!isSupabaseConfigured()) return 0;
    const supabase = getSupabaseAdmin();

    // 1. Primary check: if viewed_at column exists in PostgreSQL
    let query = supabase
      .from("partial_leads")
      .select("id", { count: "exact", head: true })
      .is("viewed_at", null)
      .eq("status", "new")
      .is("converted_lead_id", null)
      .is("archived_at", null);

    if (identity?.role === "call_center") {
      query = query.eq("call_center_id", identity.userId);
    }

    if (viewedIds.length > 0) {
      query = query.not("id", "in", `(${viewedIds.join(",")})`);
    }

    const { count, error } = await query;
    if (!error && typeof count === "number") {
      return count;
    }

    // 2. Safe Fallback when viewed_at is not migrated (error 42703 or column missing):
    // Count active unhandled partial leads (status = 'new' and unconverted)
    let fallbackQuery = supabase
      .from("partial_leads")
      .select("id", { count: "exact", head: true })
      .is("converted_lead_id", null)
      .is("archived_at", null)
      .eq("status", "new");

    if (identity?.role === "call_center") {
      fallbackQuery = fallbackQuery.eq("call_center_id", identity.userId);
    }

    if (viewedIds.length > 0) {
      fallbackQuery = fallbackQuery.not("id", "in", `(${viewedIds.join(",")})`);
    }

    const fallbackRes = await fallbackQuery;
    return fallbackRes.count ?? 0;
  } catch (err) {
    console.warn("[partial-lead] Error counting unviewed partial leads:", err);
    return 0;
  }
}

/**
 * Sets viewed_at to the current ISO timestamp for a partial lead if not already viewed.
 * Gracefully handles missing column (Postgres 42703) or missing database.
 */
export async function markPartialLeadAsViewed(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const { getSupabaseAdmin, isSupabaseConfigured } = await import("@/lib/supabase/admin");
    if (!isSupabaseConfigured()) return false;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("partial_leads")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", id)
      .is("viewed_at", null);

    if (error) {
      if (error.code === "42703" || /viewed_at|column/i.test(error.message ?? "")) {
        return false;
      }
      console.warn("[partial-lead] Failed to mark partial lead viewed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[partial-lead] Error marking partial lead viewed:", err);
    return false;
  }
}

