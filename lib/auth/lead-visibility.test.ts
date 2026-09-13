import { describe, it, expect } from "vitest";
import {
  canRoleSetStatus,
  canSeeLead,
  statusChoicesForRole,
  visibleLeadsFor,
  AGENT_STATUS_CHOICES,
  PURCHASER_STATUS_CHOICES,
  type ScopedLead,
} from "./lead-visibility";

const AGENT = "agent-uuid-1";
const OTHER_AGENT = "agent-uuid-2";
const BUYER = "buyer-uuid-1";
const OTHER_BUYER = "buyer-uuid-2";

const lead = (over: Partial<ScopedLead> = {}): ScopedLead => ({
  status: "new",
  callCenterId: null,
  purchaserId: null,
  ...over,
});

describe("canSeeLead — call centre agent", () => {
  it("sees a lead assigned to them", () => {
    expect(canSeeLead(lead({ callCenterId: AGENT }), "call_center", AGENT)).toBe(true);
  });

  it("does NOT see another agent's lead", () => {
    expect(canSeeLead(lead({ callCenterId: OTHER_AGENT }), "call_center", AGENT)).toBe(false);
  });

  it("does NOT see an unassigned lead", () => {
    expect(canSeeLead(lead({ callCenterId: null }), "call_center", AGENT)).toBe(false);
  });

  it("keeps its lead after the hand-over to a purchaser", () => {
    const handedOver = lead({ status: "inspection_scheduled", callCenterId: AGENT, purchaserId: BUYER });
    expect(canSeeLead(handedOver, "call_center", AGENT)).toBe(true);
  });
});

describe("canSeeLead — purchaser", () => {
  it.each(["inspection_scheduled", "inspected", "negotiating", "deal"])(
    "sees their own lead at %s",
    (status) => {
      expect(canSeeLead(lead({ status, purchaserId: BUYER }), "purchaser", BUYER)).toBe(true);
    },
  );

  it.each(["new", "pending", "contacted"])("does NOT see a lead still at %s", (status) => {
    // Even when the purchaser id somehow points at them: a lead before the
    // hand-over is the agent's work.
    expect(canSeeLead(lead({ status, purchaserId: BUYER }), "purchaser", BUYER)).toBe(false);
  });

  it("does NOT see another purchaser's scheduled lead", () => {
    const other = lead({ status: "inspection_scheduled", purchaserId: OTHER_BUYER });
    expect(canSeeLead(other, "purchaser", BUYER)).toBe(false);
  });

  it("does NOT see an unassigned scheduled lead", () => {
    expect(canSeeLead(lead({ status: "inspection_scheduled" }), "purchaser", BUYER)).toBe(false);
  });
});

describe("canSeeLead — owner roles", () => {
  it.each(["admin", "manager"] as const)("%s sees every lead, assigned or not", (role) => {
    expect(canSeeLead(lead(), role, "owner-uuid")).toBe(true);
    expect(canSeeLead(lead({ callCenterId: OTHER_AGENT }), role, "owner-uuid")).toBe(true);
    expect(canSeeLead(lead({ status: "deal", purchaserId: OTHER_BUYER }), role, "owner-uuid")).toBe(true);
  });
});

describe("visibleLeadsFor", () => {
  const all: (ScopedLead & { id: string })[] = [
    { id: "mine-new", status: "new", callCenterId: AGENT, purchaserId: null },
    { id: "mine-scheduled", status: "inspection_scheduled", callCenterId: AGENT, purchaserId: BUYER },
    { id: "theirs", status: "contacted", callCenterId: OTHER_AGENT, purchaserId: null },
    { id: "unassigned", status: "new", callCenterId: null, purchaserId: null },
    { id: "other-buyer-deal", status: "deal", callCenterId: OTHER_AGENT, purchaserId: OTHER_BUYER },
  ];

  it("gives an agent only their own leads", () => {
    expect(visibleLeadsFor(all, "call_center", AGENT).map((l) => l.id)).toEqual(["mine-new", "mine-scheduled"]);
  });

  it("gives a purchaser only leads handed to them", () => {
    expect(visibleLeadsFor(all, "purchaser", BUYER).map((l) => l.id)).toEqual(["mine-scheduled"]);
  });

  it("gives an owner everything", () => {
    expect(visibleLeadsFor(all, "admin", "owner-uuid")).toHaveLength(all.length);
  });
});

describe("status choices", () => {
  it("offers an agent exactly New, Contacted, Inspection Scheduled", () => {
    expect(statusChoicesForRole("call_center")).toEqual([
      "new",
      "contacted",
      "inspection_scheduled",
    ]);
  });

  it("offers a purchaser Deal and Under Negotiation; inspection completion sets Inspected", () => {
    expect(statusChoicesForRole("purchaser")).toEqual(["negotiating", "deal", "closed"]);
  });

  it("offers a purchaser Not Purchased after inspection", () => {
    expect(PURCHASER_STATUS_CHOICES).toContain("closed");
  });

  it("does not restrict owner roles", () => {
    expect(statusChoicesForRole("admin")).toBeNull();
    expect(statusChoicesForRole("manager")).toBeNull();
  });

  it("enforces the same sets that it offers", () => {
    for (const s of AGENT_STATUS_CHOICES) expect(canRoleSetStatus("call_center", s)).toBe(true);
    for (const s of PURCHASER_STATUS_CHOICES) expect(canRoleSetStatus("purchaser", s)).toBe(true);

    // An agent cannot record a deal; a purchaser cannot walk a lead backwards.
    expect(canRoleSetStatus("call_center", "deal")).toBe(false);
    expect(canRoleSetStatus("call_center", "closed")).toBe(false);
    expect(canRoleSetStatus("purchaser", "contacted")).toBe(false);
    expect(canRoleSetStatus("purchaser", "closed")).toBe(true);

    // Owners are unrestricted.
    expect(canRoleSetStatus("admin", "closed")).toBe(true);
  });
});
