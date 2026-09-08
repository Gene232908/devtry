/**
 * Round-Robin Lead Distribution Algorithm.
 *
 * Distributes incoming/unassigned leads evenly among active staff accounts based
 * on staff account creation date (created_at ASC):
 * - Oldest created account = 1st in rotation (highest priority)
 * - 2nd created account = 2nd in rotation, etc.
 * - Wraps around continuously so every agent and purchaser gets an equal number of leads.
 */

export type StaffMemberForRoundRobin = {
  id: string;
  role: "call_center" | "purchaser" | "admin" | "manager";
  createdAt?: string | null;
  isActive?: boolean;
};

/** The minimum a lead has to carry to be routed. Any richer lead type fits. */
export type AssignableLead = {
  id: string;
  status?: string;
  callCenterId?: string | null;
  purchaserId?: string | null;
};

/**
 * Assigns a array of leads to available Agents and Purchasers in round-robin sequence.
 */
export function assignLeadsRoundRobin<T extends AssignableLead>(
  leads: T[],
  staffList: StaffMemberForRoundRobin[],
): T[] {
  const activeAgents = staffList
    .filter((s) => s.role === "call_center" && s.isActive !== false)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  const activePurchasers = staffList
    .filter((s) => s.role === "purchaser" && s.isActive !== false)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  if (activeAgents.length === 0 && activePurchasers.length === 0) {
    return leads;
  }

  let purchaserCounter = 0;

  return leads.map((lead, index) => {
    const assignedAgent = activeAgents.length > 0
      ? activeAgents[index % activeAgents.length]
      : null;

    const isTransferredToPurchaser =
      lead.status === "inspection_scheduled" ||
      lead.status === "inspected" ||
      lead.status === "negotiating" ||
      lead.status === "deal";

    let assignedPurchaser = null;
    if (isTransferredToPurchaser && activePurchasers.length > 0) {
      assignedPurchaser = activePurchasers[purchaserCounter % activePurchasers.length];
      purchaserCounter++;
    }

    return {
      ...lead,
      callCenterId: lead.callCenterId ?? assignedAgent?.id ?? null,
      purchaserId: lead.purchaserId ?? assignedPurchaser?.id ?? null,
    } as T;
  });
}

/**
 * Gets the next staff member in rotation for a single newly created lead.
 */
export function getNextRoundRobinAssignee(
  staffList: StaffMemberForRoundRobin[],
  role: "call_center" | "purchaser",
  currentTotalLeads: number,
): StaffMemberForRoundRobin | null {
  const activeStaff = staffList
    .filter((s) => s.role === role && s.isActive !== false)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  if (activeStaff.length === 0) return null;
  return activeStaff[currentTotalLeads % activeStaff.length];
}

/**
 * Assigns a purchaser to a lead when status transitions to `inspection_scheduled`
 * if no purchaser is assigned yet. Uses round-robin based on staff account creation date.
 */
export function assignPurchaserOnInspectionScheduled<T extends AssignableLead>(
  lead: T,
  staffList: StaffMemberForRoundRobin[],
  allLeads: T[],
): T {
  if (lead.purchaserId) return lead;

  const activePurchasers = staffList
    .filter((s) => s.role === "purchaser" && s.isActive !== false)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  if (activePurchasers.length === 0) return lead;

  // Count existing scheduled/assigned purchaser leads to determine rotation position
  const existingAssignedCount = allLeads.filter((l) => l.purchaserId != null).length;
  const assignedPurchaser = activePurchasers[existingAssignedCount % activePurchasers.length];

  return {
    ...lead,
    purchaserId: assignedPurchaser.id,
  } as T;
}

