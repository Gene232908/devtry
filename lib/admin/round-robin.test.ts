import { describe, it, expect } from "vitest";
import {
  assignLeadsRoundRobin,
  assignPurchaserOnInspectionScheduled,
  getNextRoundRobinAssignee,
  type StaffMemberForRoundRobin,
  type AssignableLead,
} from "./round-robin";

// Deliberately out of creation order: the rotation is defined by created_at,
// not by whatever order the profiles query happened to return.
const mockStaff: StaffMemberForRoundRobin[] = [
  { id: "agent-2", role: "call_center", createdAt: "2026-01-02T00:00:00Z" },
  { id: "agent-1", role: "call_center", createdAt: "2026-01-01T00:00:00Z" },
  { id: "buyer-2", role: "purchaser", createdAt: "2026-01-02T00:00:00Z" },
  { id: "buyer-1", role: "purchaser", createdAt: "2026-01-01T00:00:00Z" },
];

describe("assignLeadsRoundRobin", () => {
  it("assigns leads round-robin by account creation date (oldest created first)", () => {
    const leads: AssignableLead[] = [
      { id: "L-1", status: "inspection_scheduled" },
      { id: "L-2", status: "inspection_scheduled" },
      { id: "L-3", status: "inspection_scheduled" },
      { id: "L-4", status: "inspection_scheduled" },
    ];

    const result = assignLeadsRoundRobin(leads, mockStaff);

    // Lead 1 -> Agent 1 (oldest) & Buyer 1 (oldest)
    expect(result[0].callCenterId).toBe("agent-1");
    expect(result[0].purchaserId).toBe("buyer-1");

    // Lead 2 -> Agent 2 & Buyer 2
    expect(result[1].callCenterId).toBe("agent-2");
    expect(result[1].purchaserId).toBe("buyer-2");

    // Lead 3 -> Agent 1 (wrap around) & Buyer 1 (wrap around)
    expect(result[2].callCenterId).toBe("agent-1");
    expect(result[2].purchaserId).toBe("buyer-1");

    // Lead 4 -> Agent 2 & Buyer 2
    expect(result[3].callCenterId).toBe("agent-2");
    expect(result[3].purchaserId).toBe("buyer-2");
  });

  it("leaves leads that have not reached a purchaser without one", () => {
    const leads: AssignableLead[] = [
      { id: "L-1", status: "new" },
      { id: "L-2", status: "contacted" },
    ];

    const result = assignLeadsRoundRobin(leads, mockStaff);

    expect(result.map((l) => l.callCenterId)).toEqual(["agent-1", "agent-2"]);
    expect(result.map((l) => l.purchaserId)).toEqual([null, null]);
  });

  it("never overwrites an assignment a lead already carries", () => {
    const leads: AssignableLead[] = [{ id: "L-1", status: "inspection_scheduled", callCenterId: "agent-2", purchaserId: "buyer-2" }];

    const [result] = assignLeadsRoundRobin(leads, mockStaff);

    expect(result.callCenterId).toBe("agent-2");
    expect(result.purchaserId).toBe("buyer-2");
  });
});

describe("getNextRoundRobinAssignee", () => {
  it("walks the rotation and wraps around", () => {
    const at = (n: number) => getNextRoundRobinAssignee(mockStaff, "call_center", n)?.id;

    expect(at(0)).toBe("agent-1");
    expect(at(1)).toBe("agent-2");
    expect(at(2)).toBe("agent-1");
    expect(at(3)).toBe("agent-2");
  });

  it("skips deactivated accounts", () => {
    const withDisabled: StaffMemberForRoundRobin[] = [
      { id: "agent-1", role: "call_center", createdAt: "2026-01-01T00:00:00Z", isActive: false },
      { id: "agent-2", role: "call_center", createdAt: "2026-01-02T00:00:00Z", isActive: true },
    ];

    expect(getNextRoundRobinAssignee(withDisabled, "call_center", 0)?.id).toBe("agent-2");
    expect(getNextRoundRobinAssignee(withDisabled, "call_center", 1)?.id).toBe("agent-2");
  });

  it("returns null when nobody active holds the role", () => {
    expect(getNextRoundRobinAssignee(mockStaff, "purchaser", 0)?.id).toBe("buyer-1");
    expect(getNextRoundRobinAssignee([], "purchaser", 0)).toBeNull();
  });
});

describe("assignPurchaserOnInspectionScheduled", () => {
  it("assigns the oldest active purchaser first", () => {
    const unassignedLead: AssignableLead = { id: "L-99", status: "inspection_scheduled" };
    const assigned = assignPurchaserOnInspectionScheduled(unassignedLead, mockStaff, []);
    expect(assigned.purchaserId).toBe("buyer-1");
  });

  it("advances the rotation as purchasers accumulate leads", () => {
    const existing: AssignableLead[] = [{ id: "L-1", status: "inspection_scheduled", purchaserId: "buyer-1" }];
    const assigned = assignPurchaserOnInspectionScheduled({ id: "L-2", status: "inspection_scheduled" }, mockStaff, existing);
    expect(assigned.purchaserId).toBe("buyer-2");
  });

  it("does not move a lead a purchaser is already working", () => {
    const lead: AssignableLead = { id: "L-1", status: "inspection_scheduled", purchaserId: "buyer-2" };
    expect(assignPurchaserOnInspectionScheduled(lead, mockStaff, []).purchaserId).toBe("buyer-2");
  });
});
