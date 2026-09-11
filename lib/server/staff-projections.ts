import type { StaffIdentity } from "@/lib/auth/permissions";
import type { DbLead } from "@/lib/admin/lead-mapper";

/**
 * lib/server/staff-projections.ts
 *
 * Role-safe projections for lead data returned to authenticated staff.
 *
 * RLS controls which ROWS a staff member can see. These projections control
 * which COLUMNS (fields) they receive. They are applied server-side before
 * sending any response — no forbidden field ever reaches the browser.
 *
 * Why not column-level grants?
 *   Column-level Postgres grants apply to direct table reads. All server-side
 *   queries here run through the service-role client which bypasses RLS
 *   entirely. Server projections are therefore the reliable enforcement layer.
 *
 * Field redaction policy (from plan.md):
 *   Call centre  → may see lead/car info, contact data, and shared follow-up
 *                  notes for their assigned leads; NOT prices or financial
 *                  metadata (purchase price, estimated value).
 *   Purchaser    → may see lead/car info, prices, and shared follow-up notes
 *                  for their assigned leads; NOT phone or email.
 *   Owner        → full row, no filtering.
 *
 * Notes policy: notes are deliberately shared within the assigned lead team so
 * a CSR-to-Purchaser handoff has the call outcome and next action. Row scoping
 * ensures operational staff receive only their own assigned leads; notes must
 * never be used as a substitute for a separate cross-lead data export.
 */

/** The safe shape of a lead as seen by operational staff. */
export type ProjectedLead = {
  id: string;
  createdAt: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  condition: string;
  optionLevel: string | undefined;
  description: string;
  location: string | undefined;
  status: string;
  isDuplicate: boolean | undefined;
  isSpam: boolean | undefined;
  // Assignment + scheduling. Present for EVERY role, never redacted: these are
  // what the dashboard filters "my leads" on, and a role that cannot see who a
  // lead belongs to cannot tell that it belongs to them.
  callCenterId: string | null;
  purchaserId: string | null;
  inspectionScheduledAt: string | null;
  // Contact fields — only for call centre role
  fullName?: string;
  phoneE164?: string;
  email?: string;
  // Financial fields — only for purchaser role and above
  estimatedValueAed?: number | null;
  // Notes — only for owners (can contain both contact and financial data)
  notes?: string;
};

/**
 * Full lead for an owner (admin/manager). No filtering.
 */
export function projectLeadForOwner(lead: DbLead): ProjectedLead {
  return {
    id: lead.id,
    createdAt: lead.created_at,
    fullName: lead.full_name,
    phoneE164: lead.phone_e164,
    email: lead.email ?? undefined,
    make: lead.make,
    model: lead.model,
    trim: lead.trim ?? "",
    year: lead.year,
    mileageKm: lead.mileage_km ?? 0,
    condition: lead.condition ?? "good",
    optionLevel: lead.option_level ?? undefined,
    description: lead.description ?? "",
    location: lead.emirate ?? undefined,
    status: lead.status,
    estimatedValueAed: lead.estimated_value_aed != null ? Number(lead.estimated_value_aed) : null,
    notes: lead.notes ?? "",
    isDuplicate: lead.is_duplicate ?? undefined,
    isSpam: lead.is_spam ?? undefined,
    callCenterId: lead.call_center_id ?? null,
    purchaserId: lead.purchaser_id ?? null,
    inspectionScheduledAt: lead.inspection_scheduled_at ?? null,
  };
}

/**
 * Call centre view: contact info and shared follow-up notes present; prices
 * excluded.
 */
export function projectLeadForCallCenter(lead: DbLead): ProjectedLead {
  return {
    id: lead.id,
    createdAt: lead.created_at,
    fullName: lead.full_name,
    phoneE164: lead.phone_e164,
    email: lead.email ?? undefined,
    make: lead.make,
    model: lead.model,
    trim: lead.trim ?? "",
    year: lead.year,
    mileageKm: lead.mileage_km ?? 0,
    condition: lead.condition ?? "good",
    optionLevel: lead.option_level ?? undefined,
    description: lead.description ?? "",
    location: lead.emirate ?? undefined,
    status: lead.status,
    isDuplicate: lead.is_duplicate ?? undefined,
    isSpam: lead.is_spam ?? undefined,
    callCenterId: lead.call_center_id ?? null,
    purchaserId: lead.purchaser_id ?? null,
    inspectionScheduledAt: lead.inspection_scheduled_at ?? null,
    notes: lead.notes ?? "",
    // estimatedValueAed intentionally absent
  };
}

/**
 * Purchaser view: prices and shared follow-up notes present; contact info
 * excluded.
 */
export function projectLeadForPurchaser(lead: DbLead): ProjectedLead {
  return {
    id: lead.id,
    createdAt: lead.created_at,
    make: lead.make,
    model: lead.model,
    trim: lead.trim ?? "",
    year: lead.year,
    mileageKm: lead.mileage_km ?? 0,
    condition: lead.condition ?? "good",
    optionLevel: lead.option_level ?? undefined,
    description: lead.description ?? "",
    location: lead.emirate ?? undefined,
    status: lead.status,
    estimatedValueAed: lead.estimated_value_aed != null ? Number(lead.estimated_value_aed) : null,
    notes: lead.notes ?? "",
    isDuplicate: lead.is_duplicate ?? undefined,
    isSpam: lead.is_spam ?? undefined,
    callCenterId: lead.call_center_id ?? null,
    purchaserId: lead.purchaser_id ?? null,
    inspectionScheduledAt: lead.inspection_scheduled_at ?? null,
    // fullName, phoneE164, email intentionally absent
  };
}

/**
 * Select the correct projection function based on caller identity.
 */
export function selectProjection(
  identity: StaffIdentity,
): (lead: DbLead) => ProjectedLead {
  switch (identity.role) {
    case "call_center":
      return projectLeadForCallCenter;
    case "purchaser":
      return projectLeadForPurchaser;
    case "admin":
    case "manager":
    default:
      return projectLeadForOwner;
  }
}
