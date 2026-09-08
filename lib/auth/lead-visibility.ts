import type { StaffRole } from "@/lib/auth/permissions";

/**
 * lib/auth/lead-visibility.ts
 *
 * One definition of who may see — and set — what on a lead.
 *
 * These rules were previously written out by hand in four places: the admin
 * leads query, the lead PATCH handler, the client leads store, and the status
 * dropdown. They had already drifted apart (the query handed unassigned leads to
 * every agent while the store hid them; the dropdown offered statuses the API
 * would not have accepted), which is exactly the failure a duplicated rule
 * produces. Both halves of the app import this instead.
 *
 * Pure and dependency-free so the server, the browser, and the tests can all
 * share it. It is a definition, not an enforcement point: the server still has
 * to apply it (see app/api/admin/leads/route.ts and app/api/leads/[id]/route.ts).
 */

/**
 * The stages at which a lead has reached a purchaser at all.
 *
 * Purchasers do not receive leads from the valuation form. A lead arrives when
 * the Call Centre agent schedules the inspection, so everything before that
 * point is the agent's stage of the pipeline and is not a purchaser's to see.
 */
export const PURCHASER_VISIBLE_STATUSES = [
  "inspection_scheduled",
  "inspected",
  "negotiating",
  "deal",
] as const;

/** Statuses a Call Centre agent may move a lead to, in pipeline order. */
export const AGENT_STATUS_CHOICES = ["new", "pending", "contacted", "inspection_scheduled"] as const;

/**
 * Statuses a purchaser may move a lead to, in the order they are offered.
 *
 * Deliberately best-outcome first, and deliberately without "closed" / Not
 * Purchased — walking away from a car is not the purchaser's call to record.
 */
export const PURCHASER_STATUS_CHOICES = ["deal", "negotiating", "inspected"] as const;

const PURCHASER_VISIBLE = new Set<string>(PURCHASER_VISIBLE_STATUSES);
const AGENT_ALLOWED = new Set<string>(AGENT_STATUS_CHOICES);
const PURCHASER_ALLOWED = new Set<string>(PURCHASER_STATUS_CHOICES);

/** The minimum a lead has to carry for these rules to be decidable. */
export type ScopedLead = {
  status: string;
  callCenterId?: string | null;
  purchaserId?: string | null;
};

/** True when `status` is one an operational role is permitted to set. */
export function canRoleSetStatus(role: StaffRole, status: string): boolean {
  if (role === "call_center") return AGENT_ALLOWED.has(status);
  if (role === "purchaser") return PURCHASER_ALLOWED.has(status);
  return true; // Owner roles are not restricted.
}

/** The statuses to offer this role, or null when every status is available. */
export function statusChoicesForRole(role: StaffRole | undefined): readonly string[] | null {
  if (role === "call_center") return AGENT_STATUS_CHOICES;
  if (role === "purchaser") return PURCHASER_STATUS_CHOICES;
  return null;
}

/**
 * Whether this specific person may see this specific lead.
 *
 * Ownership is by id and nothing else. An unassigned lead belongs to no
 * operational role — only an owner sees it, and only an owner can hand it out.
 */
export function canSeeLead(lead: ScopedLead, role: StaffRole, userId: string): boolean {
  switch (role) {
    case "admin":
    case "manager":
      return true;
    case "call_center":
      return lead.callCenterId === userId;
    case "purchaser":
      return lead.purchaserId === userId && PURCHASER_VISIBLE.has(lead.status);
    default:
      return false;
  }
}

/** `canSeeLead` over a list. */
export function visibleLeadsFor<T extends ScopedLead>(leads: T[], role: StaffRole, userId: string): T[] {
  if (role === "admin" || role === "manager") return leads;
  return leads.filter((l) => canSeeLead(l, role, userId));
}
