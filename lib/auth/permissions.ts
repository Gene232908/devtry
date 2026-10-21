/**
 * lib/auth/permissions.ts
 *
 * Single source of truth for roles and capabilities.
 *
 * StaffRole maps directly to the `user_role` postgres enum values introduced
 * in 0023_staff_roles_permissions.sql. The display label for 'admin' is
 * "Super Admin" / "Owner" in the UI — do not rename the DB value.
 *
 * Capabilities are action-level gates checked in route handlers and used to
 * conditionally render UI. They are never the primary authority; the server
 * guard re-derives capabilities from the live profile on every request.
 */

export type StaffRole = "admin" | "manager" | "call_center" | "purchaser";

/**
 * Human-readable label for each role.
 * Use this for display only — never for authorization logic.
 */
export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Super Admin",
  manager: "Owner",        // legacy role — treated as full owner access
  call_center: "Call Centre",
  purchaser: "Purchaser",
};

/**
 * Every permission gate in the system.
 *
 * Keep names action-oriented (verb + noun or object).
 */
export type Capability =
  | "manageStaff"       // create / rename / enable / disable staff accounts
  | "viewDashboard"     // see the Overview / Dashboard page
  | "viewAllLeads"      // see leads not assigned to self
  | "viewScrapInquiries" // see Scrap inquiries within the viewer's lead scope
  | "createLeads"       // create an internal lead from a walk-in, call, or message
  | "viewLeadContact"   // see phone numbers and email addresses on leads
  | "viewPrices"        // see purchase price, estimated value, profit
  | "viewCommissions"   // see commission entries and statements
  | "viewInventory"     // see the Inventory page
  | "viewIncompleteForms" // see the Incomplete Forms page
  | "viewBlockedNumbers"  // see the Blocked Numbers page
  | "viewCatalog"       // see the Vehicle Catalog page
  | "manageCatalog"     // add / edit / delete car makes, models, trims
  | "exportCsv"         // trigger CSV download of lead data
  | "manageBlocklist"   // block / unblock phone numbers
  | "assignLeads"       // assign leads to call center or purchaser
  | "viewSettings";     // read the business Settings page (owner roles only)

/**
 * The capability set for each role.
 *
 * Operational roles (call_center, purchaser) receive the minimum necessary.
 * Expanding a capability must be a deliberate code change here, not a
 * runtime decision.
 */
export const ROLE_CAPABILITIES: Record<StaffRole, Capability[]> = {
  admin: [
    "manageStaff",
    "viewDashboard",
    "viewAllLeads",
    "viewScrapInquiries",
    "createLeads",
    "viewLeadContact",
    "viewPrices",
    "viewCommissions",
    "viewInventory",
    "viewIncompleteForms",
    "viewBlockedNumbers",
    "viewCatalog",
    "manageCatalog",
    "exportCsv",
    "manageBlocklist",
    "assignLeads",
    "viewSettings",
  ],
  manager: [
    // Legacy 'manager' accounts receive full owner-level access until
    // explicitly migrated to a specific operational role.
    "manageStaff",
    "viewDashboard",
    "viewAllLeads",
    "viewScrapInquiries",
    "viewLeadContact",
    "viewPrices",
    "viewCommissions",
    "viewInventory",
    "viewIncompleteForms",
    "viewBlockedNumbers",
    "viewCatalog",
    "manageCatalog",
    "exportCsv",
    "manageBlocklist",
    "assignLeads",
    "viewSettings",
  ],
  call_center: [
    // Agent: see assigned leads, contact info, own commission, incomplete forms, and manage blocked numbers.
    "viewScrapInquiries",
    "viewLeadContact",
    "viewCommissions",
    "viewIncompleteForms",
    "viewBlockedNumbers",
    "manageBlocklist",
    "createLeads",
  ],
  purchaser: [
    // Purchaser: see assigned leads, prices, inventory, and own commission.
    "viewScrapInquiries",
    "viewPrices",
    "viewInventory",
    "viewCommissions",
  ],
};

/**
 * The resolved identity returned by requireStaff() / requireAdmin().
 * Passed through server → page props → client components so every layer
 * shares the same picture of who is acting.
 *
 * This is a server-derived value. Never accept a StaffIdentity from a
 * client request body or query parameter as an authorization authority.
 */
export type StaffIdentity = {
  userId: string;
  role: StaffRole;
  capabilities: Capability[];
  displayName: string;
};

/**
 * Check whether the given identity holds a specific capability.
 *
 * This is a pure helper for conditional rendering and early-return guards.
 * It does not replace a server-side requireAdmin() / requireStaff() call.
 */
export function hasCapability(identity: StaffIdentity, cap: Capability): boolean {
  return identity.capabilities.includes(cap);
}

/**
 * Build a StaffIdentity from a raw profile row.
 * Used by require-staff.ts and require-admin.ts.
 */
export function buildIdentity(
  userId: string,
  role: StaffRole,
  displayName: string | null,
): StaffIdentity {
  const capabilities = ROLE_CAPABILITIES[role] ?? [];
  return {
    userId,
    role,
    capabilities,
    displayName: displayName ?? role,
  };
}
