// MILESTONE 2 BRANCH ONLY — fixed demo rows for the Milestone 3 dashboard preview.
//
// These exist so every admin screen has something realistic to click through
// during the walkthrough. They are deliberately obvious as samples (UAE numbers
// from the reserved 5550xxx test range, plausible cars, varied pipeline stages)
// so nobody mistakes a demo row for a real customer.
//
// Nothing here touches the database.

import type { PartialLead } from "@/lib/admin/partial-lead";

/** Recent-ish timestamps so the dashboard never looks stale during a demo. */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

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
  created_at: string;
};

export const demoBlockedNumbers: DemoBlockedNumber[] = [
  {
    phone_e164: "+971555000901",
    reason: "manual_spam",
    note: "Repeated fake submissions with different names.",
    full_name: "Unknown",
    created_at: hoursAgo(30),
  },
  {
    phone_e164: "+971555000902",
    reason: "otp_abuse",
    note: "Blocked after repeated unverified code requests.",
    full_name: null,
    created_at: hoursAgo(50),
  },
];

/** Numbers the automatic guards flagged but nobody has acted on yet. */
export const demoSuspiciousNumbers = [
  { phone_e164: "+971555000911", attempts: 5, last_attempt: hoursAgo(4) },
  { phone_e164: "+971555000912", attempts: 3, last_attempt: hoursAgo(11) },
];
