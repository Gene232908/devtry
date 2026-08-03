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
