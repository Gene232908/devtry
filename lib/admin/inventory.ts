import { STATUS_LABEL } from "@/lib/format";

/**
 * Cars the business has bought from a lead and now owns, plus the developer's
 * frozen share of each completed sale.
 *
 * The authority on what gets WRITTEN is the `sell_inventory_item` function in
 * migration 0014 — the rules below are mirrored here only to preview a figure
 * before the owner commits to it. If the rule ever changes, change it in the
 * migration first; this file follows.
 */

export type InventoryStatus = "in_stock" | "reserved" | "sold" | "withdrawn";
export type FinancialStatus = "not_required" | "awaiting_confirmation" | "confirmed" | "paid_locked";

/** The developer's share of the profit on each completed sale. */
export const COMMISSION_RATE = 0.02;

/**
 * The call centre agent's and purchaser's shares of the profit on each
 * completed sale — the same 2% / 10% quoted on the Commission page.
 *
 * Unlike `COMMISSION_RATE`, neither is frozen per sale in the database yet
 * (the Commission page's per-staff totals have no backing table — see
 * KNOWN_ISSUES); these are mirrored here only so the Inventory summary can
 * total all three roles together against the same profit figure it already
 * computes.
 */
export const AGENT_COMMISSION_RATE = 0.02;
export const PURCHASER_COMMISSION_RATE = 0.1;

/** Frozen at the moment of sale — see migration 0014. */
export type CommissionEntry = {
  profitAed: number;
  rate: number;
  commissionAed: number;
  soldAt: string;
};

export type InventoryItem = {
  id: string;
  leadId: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number | null;
  chassisNumber: string;
  purchasePriceAed: number;
  purchasedAt: string;
  status: InventoryStatus;
  salePriceAed: number | null;
  soldAt: string | null;
  expenseTotalAed: number;
  netProfitAed: number | null;
  financialStatus: FinancialStatus;
  financialReviewVersion: number;
  notes: string;
  /** Present only once the car has been sold. */
  commission: CommissionEntry | null;
  /**
   * True when nobody has established that the seller owns the phone number.
   *
   * Keyed on `leads.phone_verified`, NOT on where the lead came from. Those are
   * different facts: origin never changes, but trust does — an admin who ticks
   * "I have spoken to this customer on this number" while recording a purchase
   * has verified it just as surely as an OTP would, and the badge has to stop
   * accusing them at that point.
   *
   * Read from the lead rather than snapshotted here, so it stays right when the
   * lead is corrected later. Only an explicit `false` shows the badge: if the
   * relation could not be read there is no evidence of anything, and silence is
   * better than an accusation drawn from a missing join.
   */
  fromUnverifiedLead: boolean;
  callCenterId: string | null;
  purchaserId: string | null;
  /** Permanent origin inherited from the linked lead. */
  inquiryType?: "valuation" | "scrap";
  /** Frozen staff-ledger amounts; null means this sale did not credit that role. */
  callCenterCommissionAed?: number | null;
  purchaserCommissionAed?: number | null;
};

export const INVENTORY_STATUS_LABEL: Record<InventoryStatus, string> = {
  in_stock: "In Stock",
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "Withdrawn",
};

export const INVENTORY_STATUS_HINT: Record<InventoryStatus, string> = {
  in_stock: "Owned and available to sell.",
  reserved: "A buyer is committed but the sale is not completed yet.",
  sold: "Sold on — sale price recorded and the developer share calculated.",
  withdrawn: "No longer for sale. Kept on record so the money spent is still visible.",
};

/**
 * Statuses an admin may set directly.
 *
 * "sold" is absent on purpose: it is not a status you pick, it is the result of
 * recording a sale price, which happens through its own action so the money can
 * never be skipped.
 *
 * "reserved" and "withdrawn" were removed from the interface. Both were fully
 * implemented server-side and offered in the filter, but nothing in the admin
 * could ever put a car into either state — so the filter offered two options
 * that could never match a row, and the API accepted two statuses no screen
 * could send. A control that cannot do anything is worse than a missing one: it
 * implies a capability the product does not have.
 *
 * They remain in the database enum and in `InventoryStatus`. Removing them
 * there would need a migration, and leaving them costs nothing — a car that
 * somehow held one would still render its label rather than a blank.
 */
export const INVENTORY_STATUS_OPTIONS: InventoryStatus[] = ["in_stock"];

export const INVENTORY_FILTER_OPTIONS: InventoryStatus[] = ["in_stock", "sold"];

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * What the owner would owe if this car sold at `salePriceAed` — shown live while
 * he types, so the number is never a surprise after saving.
 *
 * Only the purchase price is deducted; repairs, registration and transport are
 * not, per the milestone agreement. A loss produces no commission and is not
 * carried against other sales.
 */
export function previewCommission(purchasePriceAed: number, salePriceAed: number, expenseTotalAed = 0) {
  const profitAed = round2(salePriceAed - purchasePriceAed - expenseTotalAed);
  return {
    profitAed,
    rate: COMMISSION_RATE,
    commissionAed: round2(Math.max(profitAed, 0) * COMMISSION_RATE),
  };
}

/** Shape of a row from the Supabase `inventory` table (snake_case). */
export type DbInventory = {
  id: string;
  lead_id: string;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  chassis_number?: string | null;
  purchase_price_aed: number | string;
  purchased_at: string;
  status: InventoryStatus;
  sale_price_aed: number | string | null;
  sold_at: string | null;
  expense_total_aed?: number | string | null;
  net_profit_aed?: number | string | null;
  financial_status?: FinancialStatus | null;
  financial_review_version?: number | null;
  notes: string | null;
  // Supabase returns an embedded one-to-one relation as an object, but an
  // array when it cannot prove uniqueness. Both are accepted so a schema-cache
  // quirk degrades to "commission not shown" instead of a crash on a money screen.
  commission_entries?: DbCommissionEntry | DbCommissionEntry[] | null;
  /** Embedded from the parent lead. Same one-or-array shape caveat as above. */
  leads?: {
    phone_verified?: boolean | null;
    call_center_id?: string | null;
    purchaser_id?: string | null;
    inquiry_type?: "valuation" | "scrap" | null;
  } | Array<{
    phone_verified?: boolean | null;
    call_center_id?: string | null;
    purchaser_id?: string | null;
    inquiry_type?: "valuation" | "scrap" | null;
  }> | null;
};

export type DbCommissionEntry = {
  profit_aed: number | string;
  rate: number | string;
  commission_aed: number | string;
  sold_at: string;
};

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapDbInventory(r: DbInventory): InventoryItem {
  const raw = r.commission_entries;
  const entry = Array.isArray(raw) ? raw[0] : raw;

  const leadRel = Array.isArray(r.leads) ? r.leads[0] : r.leads;
  const leadPhoneVerified = leadRel?.phone_verified ?? null;

  return {
    id: r.id,
    leadId: r.lead_id,
    make: r.make,
    model: r.model,
    trim: r.trim ?? "",
    year: r.year,
    mileageKm: num(r.mileage_km),
    chassisNumber: r.chassis_number ?? "",
    purchasePriceAed: num(r.purchase_price_aed) ?? 0,
    purchasedAt: r.purchased_at,
    status: r.status,
    salePriceAed: num(r.sale_price_aed),
    soldAt: r.sold_at,
    expenseTotalAed: num(r.expense_total_aed) ?? 0,
    netProfitAed: num(r.net_profit_aed),
    financialStatus: r.financial_status ?? "not_required",
    financialReviewVersion: r.financial_review_version ?? 0,
    notes: r.notes ?? "",
    commission: entry
      ? {
          profitAed: num(entry.profit_aed) ?? 0,
          rate: num(entry.rate) ?? COMMISSION_RATE,
          commissionAed: num(entry.commission_aed) ?? 0,
          soldAt: entry.sold_at,
        }
      : null,
    fromUnverifiedLead: leadPhoneVerified === false,
    callCenterId: leadRel?.call_center_id ?? null,
    purchaserId: leadRel?.purchaser_id ?? null,
    inquiryType: leadRel?.inquiry_type === "scrap" ? "scrap" : "valuation",
    callCenterCommissionAed: null,
    purchaserCommissionAed: null,
  };
}

/** Re-exported so inventory screens can label the lead a car came from. */
export { STATUS_LABEL as LEAD_STATUS_LABEL };
