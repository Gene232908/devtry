import { describe, it, expect } from "vitest";
import {
  ROLE_CAPABILITIES,
  ROLE_LABELS,
  hasCapability,
  buildIdentity,
  type StaffRole,
  type Capability,
} from "@/lib/auth/permissions";

/**
 * lib/auth/permissions.test.ts
 *
 * Verifies the role → capability matrix and identity helpers.
 */

describe("ROLE_LABELS", () => {
  it("has a human-readable label for every role", () => {
    const roles: StaffRole[] = ["admin", "manager", "call_center", "purchaser"];
    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});

describe("ROLE_CAPABILITIES", () => {
  const allCaps: Capability[] = [
    "manageStaff",
    "viewDashboard",
    "viewAllLeads",
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
    "viewSettings",
  ];

  it("admin has all capabilities", () => {
    for (const cap of allCaps) {
      expect(ROLE_CAPABILITIES.admin).toContain(cap);
    }
  });

  it("manager has all capabilities (legacy full-access)", () => {
    for (const cap of allCaps) {
      expect(ROLE_CAPABILITIES.manager).toContain(cap);
    }
  });

  it("call_center can see contact info, commissions, incomplete forms, and blocked numbers", () => {
    expect(ROLE_CAPABILITIES.call_center).toContain("viewLeadContact");
    expect(ROLE_CAPABILITIES.call_center).toContain("viewCommissions");
    expect(ROLE_CAPABILITIES.call_center).toContain("viewIncompleteForms");
    expect(ROLE_CAPABILITIES.call_center).toContain("viewBlockedNumbers");
    expect(ROLE_CAPABILITIES.call_center).not.toContain("viewPrices");
    expect(ROLE_CAPABILITIES.call_center).not.toContain("viewDashboard");
    expect(ROLE_CAPABILITIES.call_center).not.toContain("viewInventory");
    expect(ROLE_CAPABILITIES.call_center).not.toContain("manageStaff");
    expect(ROLE_CAPABILITIES.call_center).not.toContain("exportCsv");
  });

  it("purchaser can see prices, inventory, and commissions", () => {
    expect(ROLE_CAPABILITIES.purchaser).toContain("viewPrices");
    expect(ROLE_CAPABILITIES.purchaser).toContain("viewInventory");
    expect(ROLE_CAPABILITIES.purchaser).toContain("viewCommissions");
    expect(ROLE_CAPABILITIES.purchaser).not.toContain("viewLeadContact");
    expect(ROLE_CAPABILITIES.purchaser).not.toContain("viewDashboard");
    expect(ROLE_CAPABILITIES.purchaser).not.toContain("viewIncompleteForms");
    expect(ROLE_CAPABILITIES.purchaser).not.toContain("viewBlockedNumbers");
    expect(ROLE_CAPABILITIES.purchaser).not.toContain("manageStaff");
    expect(ROLE_CAPABILITIES.purchaser).not.toContain("exportCsv");
  });

  it("call_center and purchaser both have viewSettings", () => {
    expect(ROLE_CAPABILITIES.call_center).toContain("viewSettings");
    expect(ROLE_CAPABILITIES.purchaser).toContain("viewSettings");
  });
});

describe("hasCapability", () => {
  it("returns true when the identity holds the capability", () => {
    const identity = buildIdentity("user-1", "admin", "Owner");
    expect(hasCapability(identity, "manageStaff")).toBe(true);
  });

  it("returns false when the identity lacks the capability", () => {
    const identity = buildIdentity("user-2", "call_center", "Maricel");
    expect(hasCapability(identity, "viewPrices")).toBe(false);
  });

  it("call_center can view contact but not prices", () => {
    const identity = buildIdentity("user-3", "call_center", "Agent");
    expect(hasCapability(identity, "viewLeadContact")).toBe(true);
    expect(hasCapability(identity, "viewPrices")).toBe(false);
  });

  it("purchaser can view prices but not contact", () => {
    const identity = buildIdentity("user-4", "purchaser", "Michael");
    expect(hasCapability(identity, "viewPrices")).toBe(true);
    expect(hasCapability(identity, "viewLeadContact")).toBe(false);
  });
});

describe("buildIdentity", () => {
  it("fills in role as displayName when name is null", () => {
    const identity = buildIdentity("user-5", "purchaser", null);
    expect(identity.displayName).toBe("purchaser");
  });

  it("assigns the capability set for the role", () => {
    const identity = buildIdentity("user-6", "call_center", "Test");
    expect(identity.capabilities).toEqual(ROLE_CAPABILITIES.call_center);
  });

  it("includes userId and role", () => {
    const identity = buildIdentity("abc", "admin", "Boss");
    expect(identity.userId).toBe("abc");
    expect(identity.role).toBe("admin");
  });
});
