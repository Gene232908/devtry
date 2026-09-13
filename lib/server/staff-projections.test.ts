import { describe, it, expect } from "vitest";
import {
  projectLeadForOwner,
  projectLeadForCallCenter,
  projectLeadForPurchaser,
  selectProjection,
} from "@/lib/server/staff-projections";
import { buildIdentity } from "@/lib/auth/permissions";
import type { DbLead } from "@/lib/admin/lead-mapper";

/**
 * lib/server/staff-projections.test.ts
 *
 * Verifies role-safe field projections for lead data.
 */

const SAMPLE: DbLead = {
  id: "lead-1",
  created_at: "2026-09-01T10:00:00Z",
  full_name: "Ali Hassan",
  phone_e164: "+971501234567",
  email: "ali@example.com",
  make: "Toyota",
  model: "Camry",
  trim: "SE",
  year: 2022,
  mileage_km: 30000,
  condition: "good",
  option_level: "Mid Mode",
  description: "Well maintained",
  emirate: "Dubai",
  status: "new",
  estimated_value_aed: 85000,
  notes: "Customer called twice. Offer around AED 80k.",
  is_duplicate: false,
  is_spam: false,
  call_center_id: "agent-uuid-1",
  purchaser_id: "buyer-uuid-1",
  inspection_scheduled_at: "2026-09-12T09:30:00Z",
};

// ─── Owner ─────────────────────────────────────────────────────────────────

describe("projectLeadForOwner", () => {
  const result = projectLeadForOwner(SAMPLE);

  it("exposes full name and contact info", () => {
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.phoneE164).toBe("+971501234567");
    expect(result.email).toBe("ali@example.com");
  });

  it("exposes price", () => {
    expect(result.estimatedValueAed).toBe(85000);
  });

  it("exposes notes", () => {
    expect(result.notes).toBe("Customer called twice. Offer around AED 80k.");
  });
});

// ─── Call Centre ────────────────────────────────────────────────────────────

describe("projectLeadForCallCenter", () => {
  const result = projectLeadForCallCenter(SAMPLE);

  it("exposes contact info (name, phone, email)", () => {
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.phoneE164).toBe("+971501234567");
    expect(result.email).toBe("ali@example.com");
  });

  it("does NOT expose price", () => {
    expect(result.estimatedValueAed).toBeUndefined();
  });

  it("exposes shared follow-up notes for the assigned CSR", () => {
    expect(result.notes).toBe("Customer called twice. Offer around AED 80k.");
  });

  it("exposes vehicle details", () => {
    expect(result.make).toBe("Toyota");
    expect(result.model).toBe("Camry");
    expect(result.year).toBe(2022);
  });
});

// ─── Purchaser ──────────────────────────────────────────────────────────────

describe("projectLeadForPurchaser", () => {
  const result = projectLeadForPurchaser(SAMPLE);

  it("exposes only the customer name needed to identify the inspection", () => {
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.phoneE164).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  it("exposes price", () => {
    expect(result.estimatedValueAed).toBe(85000);
  });

  it("exposes shared follow-up notes for the assigned Purchaser", () => {
    expect(result.notes).toBe("Customer called twice. Offer around AED 80k.");
  });

  it("exposes vehicle details", () => {
    expect(result.make).toBe("Toyota");
    expect(result.status).toBe("new");
  });
});

// ─── selectProjection ────────────────────────────────────────────────────────

describe("selectProjection", () => {
  it("returns owner projection for admin", () => {
    const identity = buildIdentity("u1", "admin", "Boss");
    const project = selectProjection(identity);
    const result = project(SAMPLE);
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.notes).toBeDefined();
  });

  it("returns owner projection for manager (legacy full-access)", () => {
    const identity = buildIdentity("u2", "manager", "Owner");
    const project = selectProjection(identity);
    const result = project(SAMPLE);
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.notes).toBeDefined();
  });

  it("returns call_center projection for call_center role", () => {
    const identity = buildIdentity("u3", "call_center", "Maricel");
    const project = selectProjection(identity);
    const result = project(SAMPLE);
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.estimatedValueAed).toBeUndefined();
  });

  it("returns purchaser projection for purchaser role", () => {
    const identity = buildIdentity("u4", "purchaser", "Michael");
    const project = selectProjection(identity);
    const result = project(SAMPLE);
    expect(result.fullName).toBe("Ali Hassan");
    expect(result.estimatedValueAed).toBe(85000);
  });
});

// ─── Notes exclusion ─────────────────────────────────────────────────────────

describe("shared follow-up notes policy", () => {
  const notesWithContact: DbLead = { ...SAMPLE, notes: "Call +971509999999 to confirm." };
  const notesWithMoney: DbLead = { ...SAMPLE, notes: "Profit margin AED 15000." };

  it("call_center sees notes for its assigned leads", () => {
    const result = projectLeadForCallCenter(notesWithContact);
    expect(result.notes).toBe("Call +971509999999 to confirm.");
  });

  it("purchaser sees notes for its assigned leads", () => {
    const result = projectLeadForPurchaser(notesWithMoney);
    expect(result.notes).toBe("Profit margin AED 15000.");
  });
});

// ─── Assignment fields ─────────────────────────────────────────────────────

describe("assignment fields", () => {
  // These are never redacted. They are what "my leads" is filtered on, so a role
  // that cannot see who a lead belongs to cannot tell that it belongs to them —
  // which is precisely what happened when the projections dropped them: every
  // agent and purchaser received a list that filtered down to nothing.
  it.each([
    ["owner", projectLeadForOwner],
    ["call centre", projectLeadForCallCenter],
    ["purchaser", projectLeadForPurchaser],
  ] as const)("survive the %s projection", (_label, project) => {
    const result = project(SAMPLE);

    expect(result.callCenterId).toBe("agent-uuid-1");
    expect(result.purchaserId).toBe("buyer-uuid-1");
    expect(result.inspectionScheduledAt).toBe("2026-09-12T09:30:00Z");
  });

  it("normalises a missing schedule to null rather than undefined", () => {
    const result = projectLeadForPurchaser({ ...SAMPLE, inspection_scheduled_at: null });
    expect(result.inspectionScheduledAt).toBeNull();
  });
});
