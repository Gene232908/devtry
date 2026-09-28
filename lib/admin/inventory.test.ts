import { describe, it, expect } from "vitest";
import {
  AGENT_COMMISSION_RATE,
  COMMISSION_RATE,
  mapDbInventory,
  previewCommission,
  PURCHASER_COMMISSION_RATE,
  type DbInventory,
} from "./inventory";

// These assertions describe the agreed commercial rules, not just the code:
// purchase price and confirmed expenses are deducted, a loss earns nothing, and a loss is
// never carried against another sale. The same rules are enforced for real by
// sell_inventory_item() in migration 0014 — if one changes, both must.

describe("previewCommission", () => {
  it("takes 2% of the profit on a normal sale", () => {
    // The client's own worked example: bought 20,000, sold 25,000.
    const { profitAed, commissionAed, rate } = previewCommission(20000, 25000);
    expect(profitAed).toBe(5000);
    expect(rate).toBe(COMMISSION_RATE);
    expect(commissionAed).toBe(100);
  });

  it("uses net profit after manual expenses", () => {
    // Sir Nyash's confirmed example: 25,000 - 20,000 - 520 = 4,480.
    const preview = previewCommission(20000, 25000, 520);
    expect(preview.profitAed).toBe(4480);
    expect(preview.commissionAed).toBe(89.6);
  });

  it("earns nothing when the car sells at a loss", () => {
    const { profitAed, commissionAed } = previewCommission(20000, 18000);
    expect(profitAed).toBe(-2000);
    expect(commissionAed).toBe(0);
  });

  it("never returns a negative commission", () => {
    expect(previewCommission(500000, 1).commissionAed).toBe(0);
  });

  it("earns nothing when the car sells for exactly what it cost", () => {
    expect(previewCommission(75000, 75000)).toMatchObject({ profitAed: 0, commissionAed: 0 });
  });

  it("rounds to fils rather than leaving a floating-point tail", () => {
    // 0.1 + 0.2 territory: 2% of 1234.57 is 24.6914, which must not surface
    // as 24.691400000000002 on an invoice.
    const { commissionAed } = previewCommission(1000, 2234.57);
    expect(commissionAed).toBe(24.69);
  });

  it("handles a luxury-car figure without precision drift", () => {
    const { profitAed, commissionAed } = previewCommission(2100000, 2350000);
    expect(profitAed).toBe(250000);
    expect(commissionAed).toBe(5000);
  });
});

describe("staff commission rates", () => {
  // These mirror the SQL defaults in sell_inventory_item (migration 0025) and
  // the rates quoted on the Commission page — a drift between any two of the
  // three would show a different figure than what actually got paid.
  it("agent rate matches the 2% quoted on the Commission page", () => {
    expect(AGENT_COMMISSION_RATE).toBe(0.02);
  });

  it("purchaser rate matches the 10% quoted on the Commission page", () => {
    expect(PURCHASER_COMMISSION_RATE).toBe(0.1);
  });
});

describe("mapDbInventory", () => {
  const row: DbInventory = {
    id: "inv-1",
    lead_id: "L-1",
    make: "Nissan",
    model: "Patrol",
    trim: null,
    year: 2022,
    mileage_km: 31000,
    chassis_number: "VIN-DEMO-001",
    // Postgres numeric arrives over the wire as a string.
    purchase_price_aed: "170000.00",
    purchased_at: "2026-07-01T10:00:00Z",
    status: "in_stock",
    sale_price_aed: null,
    sold_at: null,
    notes: null,
  };

  it("converts numeric strings to numbers so arithmetic is not string concatenation", () => {
    const item = mapDbInventory(row);
    expect(item.purchasePriceAed).toBe(170000);
    expect(item.mileageKm).toBe(31000);
    expect(item.chassisNumber).toBe("VIN-DEMO-001");
  });

  it("reports no commission for a car that has not sold", () => {
    expect(mapDbInventory(row).commission).toBeNull();
  });

  it("inherits a permanent Scrap origin from the linked lead", () => {
    expect(mapDbInventory({ ...row, leads: { inquiry_type: "scrap" } }).inquiryType).toBe("scrap");
  });

  it("reads an embedded commission entry returned as an object", () => {
    const item = mapDbInventory({
      ...row,
      status: "sold",
      sale_price_aed: "185000.00",
      sold_at: "2026-08-01T10:00:00Z",
      commission_entries: {
        profit_aed: "15000.00",
        rate: "0.0200",
        commission_aed: "300.00",
        sold_at: "2026-08-01T10:00:00Z",
      },
    });
    expect(item.commission).toMatchObject({ profitAed: 15000, commissionAed: 300, rate: 0.02 });
  });

  it("reads the same entry when Supabase returns it as an array", () => {
    const item = mapDbInventory({
      ...row,
      commission_entries: [
        { profit_aed: "15000.00", rate: "0.0200", commission_aed: "300.00", sold_at: "2026-08-01T10:00:00Z" },
      ],
    });
    expect(item.commission?.commissionAed).toBe(300);
  });

  it("degrades to no commission rather than throwing on an empty relation array", () => {
    expect(mapDbInventory({ ...row, commission_entries: [] }).commission).toBeNull();
  });
});
