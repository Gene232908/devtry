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

/** The developer's share of the profit on each completed sale. */
export const COMMISSION_RATE = 0.02;

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
  purchasePriceAed: number;
  purchasedAt: string;
  status: InventoryStatus;
  salePriceAed: number | null;
  soldAt: string | null;
  notes: string;
  /** Present only once the car has been sold. */
  commission: CommissionEntry | null;
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
 * Statuses selectable before a sale. "Sold" is missing on purpose: it is not a
 * status you pick, it is the result of recording a sale price, which happens
 * through its own action so the figures can never be skipped.
 */
export const INVENTORY_STATUS_OPTIONS: InventoryStatus[] = ["in_stock", "reserved", "withdrawn"];

export const INVENTORY_FILTER_OPTIONS: InventoryStatus[] = ["in_stock", "reserved", "sold", "withdrawn"];

function round2(n: number): number {
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
export function previewCommission(purchasePriceAed: number, salePriceAed: number) {
  const profitAed = round2(salePriceAed - purchasePriceAed);
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
  purchase_price_aed: number | string;
  purchased_at: string;
  status: InventoryStatus;
  sale_price_aed: number | string | null;
  sold_at: string | null;
  notes: string | null;
  // Supabase returns an embedded one-to-one relation as an object, but an
  // array when it cannot prove uniqueness. Both are accepted so a schema-cache
  // quirk degrades to "commission not shown" instead of a crash on a money screen.
  commission_entries?: DbCommissionEntry | DbCommissionEntry[] | null;
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

  return {
    id: r.id,
    leadId: r.lead_id,
    make: r.make,
    model: r.model,
    trim: r.trim ?? "",
    year: r.year,
    mileageKm: num(r.mileage_km),
    purchasePriceAed: num(r.purchase_price_aed) ?? 0,
    purchasedAt: r.purchased_at,
    status: r.status,
    salePriceAed: num(r.sale_price_aed),
    soldAt: r.sold_at,
    notes: r.notes ?? "",
    commission: entry
      ? {
          profitAed: num(entry.profit_aed) ?? 0,
          rate: num(entry.rate) ?? COMMISSION_RATE,
          commissionAed: num(entry.commission_aed) ?? 0,
          soldAt: entry.sold_at,
        }
      : null,
  };
}

/** Re-exported so inventory screens can label the lead a car came from. */
export { STATUS_LABEL as LEAD_STATUS_LABEL };
