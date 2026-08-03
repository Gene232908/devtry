// MILESTONE 2 BRANCH ONLY — fixed demo rows for the Milestone 3 dashboard preview.
//
// These exist so every admin screen has something realistic to click through
// during the walkthrough. They are deliberately obvious as samples (UAE numbers
// from the reserved 5550xxx test range, plausible cars, varied pipeline stages)
// so nobody mistakes a demo row for a real customer.
//
// Nothing here touches the database.

import type { PartialLead } from "@/lib/admin/partial-lead";
import type { Lead } from "@/config/mock-data";
import type { InventoryItem } from "@/lib/admin/inventory";
import type { CommissionStatement } from "@/lib/admin/commission";

/** Recent-ish timestamps so the dashboard never looks stale during a demo. */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Untouched leads, dated today. The rest of the demo set is older and already
 * worked, so without these the dashboard opens with an empty "Recent Leads"
 * panel and nothing to demonstrate: New-first ordering has nothing to lift to
 * the top, and there is no lead to open and show turning into Pending.
 */
export const demoNewLeads: Lead[] = [
  {
    id: "L-400881",
    fullName: "Noura Al Hammadi",
    phoneE164: "+971555000201",
    email: "",
    make: "Porsche",
    model: "Macan",
    trim: "GTS",
    year: 2023,
    mileageKm: 14500,
    condition: "excellent",
    optionLevel: "Full Option",
    description: "Agency serviced, still under warranty. Selling before relocating.",
    location: "Dubai",
    status: "new",
    estimatedValueAed: null,
    notes: "",
    createdAt: hoursAgo(2),
  },
  {
    id: "L-400880",
    fullName: "Tariq Bin Saleh",
    phoneE164: "+971555000202",
    email: "tariq.s@example.com",
    make: "Mercedes-Benz",
    model: "G-Class",
    trim: "G 63 AMG",
    year: 2021,
    mileageKm: 38000,
    condition: "excellent",
    optionLevel: "Full Option",
    description: "Two owners, full service history, no accidents.",
    location: "Abu Dhabi",
    status: "new",
    estimatedValueAed: null,
    notes: "",
    createdAt: hoursAgo(6),
  },
  {
    id: "L-400879",
    fullName: "Aisha Rahman",
    phoneE164: "+971555000203",
    email: "",
    make: "Nissan",
    model: "Patrol",
    trim: "SE Titanium",
    year: 2019,
    mileageKm: 91000,
    condition: "good",
    optionLevel: "Mid Mode",
    description: "Family car, regularly serviced, minor scratches on rear bumper.",
    location: "Sharjah",
    status: "new",
    estimatedValueAed: null,
    notes: "",
    createdAt: hoursAgo(11),
  },
];

export const demoPartialLeads: PartialLead[] = [
  {
    id: "demo-partial-1",
    created_at: hoursAgo(3),
    updated_at: hoursAgo(3),
    phone_e164: "+971555000101",
    full_name: "Rashid Al Nuaimi",
    consent: true,
    status: "new",
    notes: "",
    furthest_step: 1,
    last_trigger: "close",
    make: null,
    model: null,
    year: null,
    mileage_km: null,
    description: null,
  },
  {
    id: "demo-partial-2",
    created_at: hoursAgo(9),
    updated_at: hoursAgo(2),
    phone_e164: "+971555000102",
    full_name: "Mariam Al Zaabi",
    consent: true,
    status: "contacted",
    notes: "Called once — asked us to try again after the weekend.",
    furthest_step: 2,
    last_trigger: "next",
    make: "Toyota",
    model: "Land Cruiser",
    year: 2021,
    mileage_km: 52000,
    description: null,
  },
  {
    id: "demo-partial-3",
    created_at: hoursAgo(26),
    updated_at: hoursAgo(26),
    phone_e164: "+971555000103",
    full_name: "Hamdan Saeed",
    consent: false,
    status: "new",
    notes: "",
    furthest_step: 2,
    last_trigger: "consent",
    make: "BMW",
    model: "X5",
    year: 2020,
    mileage_km: 68000,
    description: "Selling because of relocation.",
  },
];

export type DemoBlockedNumber = {
  phone_e164: string;
  reason: string;
  note: string | null;
  full_name: string | null;
  source_lead_id: string | null;
  created_at: string;
};

export const demoBlockedNumbers: DemoBlockedNumber[] = [
  {
    phone_e164: "+971555000901",
    reason: "manual_spam",
    note: "Repeated fake submissions with different names.",
    full_name: "Yusuf Al Marri",
    // Blocked from a lead, so the name links back to that lead's record.
    source_lead_id: "L-400866",
    created_at: hoursAgo(30),
  },
  {
    phone_e164: "+971555000902",
    reason: "otp_abuse",
    note: "Blocked after repeated unverified code requests.",
    full_name: null,
    // Raised by the automatic guards — no lead behind it, so no link.
    source_lead_id: null,
    created_at: hoursAgo(50),
  },
];

/** Numbers the automatic guards flagged but nobody has acted on yet. */
export const demoSuspiciousNumbers = [
  { phone_e164: "+971555000911", attempts: 5, last_attempt: hoursAgo(4) },
  { phone_e164: "+971555000912", attempts: 3, last_attempt: hoursAgo(11) },
];

/**
 * Cars the business owns, for the Inventory walkthrough. Each one points at a
 * lead in `mockLeads` so the links between the two screens work.
 *
 * The set is chosen to show every rule at once: stock still on the lot, a
 * reserved car, two ordinary profitable sales, and — deliberately — one sold at
 * a loss, which earns no commission at all. That last row is the one worth
 * pausing on in a walkthrough, because it is the rule people assume works the
 * other way.
 */
export const demoInventory: InventoryItem[] = [
  {
    id: "INV-0005",
    leadId: "L-400868",
    make: "Rolls-Royce",
    model: "Phantom",
    trim: "Extended Wheelbase",
    year: 2023,
    mileageKm: 3100,
    purchasePriceAed: 2000000,
    purchasedAt: hoursAgo(24 * 3),
    status: "in_stock",
    salePriceAed: null,
    soldAt: null,
    notes: "VIP purchase — handle personally.",
    commission: null,
  },
  {
    id: "INV-0004",
    leadId: "L-400867",
    make: "Nissan",
    model: "Patrol",
    trim: "XE",
    year: 2019,
    mileageKm: 88000,
    purchasePriceAed: 88000,
    purchasedAt: hoursAgo(24 * 9),
    status: "reserved",
    salePriceAed: null,
    soldAt: null,
    notes: "Buyer paid a deposit, collecting Friday.",
    commission: null,
  },
  {
    id: "INV-0003",
    leadId: "L-400872",
    make: "Nissan",
    model: "Patrol",
    trim: "LE Platinum",
    year: 2022,
    mileageKm: 31000,
    purchasePriceAed: 170000,
    purchasedAt: hoursAgo(24 * 26),
    status: "sold",
    salePriceAed: 185000,
    soldAt: hoursAgo(24 * 5),
    notes: "",
    commission: { profitAed: 15000, rate: 0.02, commissionAed: 300, soldAt: hoursAgo(24 * 5) },
  },
  {
    id: "INV-0002",
    leadId: "L-400865",
    make: "Toyota",
    model: "Land Cruiser",
    trim: "VXR",
    year: 2021,
    mileageKm: 47000,
    purchasePriceAed: 155000,
    purchasedAt: hoursAgo(24 * 40),
    status: "sold",
    salePriceAed: 172500,
    soldAt: hoursAgo(24 * 12),
    notes: "",
    commission: { profitAed: 17500, rate: 0.02, commissionAed: 350, soldAt: hoursAgo(24 * 12) },
  },
  {
    id: "INV-0001",
    leadId: "L-400866",
    make: "Porsche",
    model: "Cayenne",
    trim: "S",
    year: 2020,
    mileageKm: 55000,
    purchasePriceAed: 205000,
    purchasedAt: hoursAgo(24 * 55),
    status: "sold",
    salePriceAed: 198000,
    soldAt: hoursAgo(24 * 20),
    notes: "Held too long; sold below cost to clear it.",
    // Sold at a loss, so no commission is due and the loss is not carried
    // against the profitable sales above.
    commission: { profitAed: -7000, rate: 0.02, commissionAed: 0, soldAt: hoursAgo(24 * 20) },
  },
];

/** First day of the month `n` months back, as `yyyy-mm-01`. */
function monthsBack(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Monthly commission statements for the walkthrough.
 *
 * The current month is left as a draft and its totals match `demoInventory`
 * exactly — two profitable sales (AED 300 + 350) and one sold at a loss earning
 * nothing, so AED 650 on AED 25,500 of profit. Anyone checking the Commission
 * screen against the Inventory screen should find the same numbers.
 *
 * The three months before it are settled, so a completed quarter and a
 * quarter-in-progress are both visible at once.
 */
export const demoCommissionStatements: CommissionStatement[] = [
  {
    id: "CS-0004",
    periodMonth: monthsBack(0),
    entryCount: 3,
    totalProfitAed: 25500,
    totalCommissionAed: 650,
    status: "draft",
    issuedAt: null,
    paidAt: null,
    paymentNote: "",
  },
  {
    id: "CS-0003",
    periodMonth: monthsBack(1),
    entryCount: 2,
    totalProfitAed: 41000,
    totalCommissionAed: 820,
    status: "paid",
    issuedAt: monthsBack(0),
    paidAt: monthsBack(0),
    paymentNote: "Bank transfer ref 88213",
  },
  {
    id: "CS-0002",
    periodMonth: monthsBack(2),
    entryCount: 1,
    totalProfitAed: 12000,
    totalCommissionAed: 240,
    status: "paid",
    issuedAt: monthsBack(1),
    paidAt: monthsBack(0),
    paymentNote: "Bank transfer ref 88213",
  },
  {
    id: "CS-0001",
    periodMonth: monthsBack(3),
    entryCount: 2,
    totalProfitAed: 28000,
    totalCommissionAed: 560,
    status: "paid",
    issuedAt: monthsBack(2),
    paidAt: monthsBack(2),
    paymentNote: "Bank transfer ref 87004",
  },
];
