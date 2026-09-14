import { describe, expect, it } from "vitest";
import { manualLeadSchema } from "@/lib/admin/manual-lead-schema";

const validLead = {
  fullName: "Test Customer",
  phone: "+971501234567",
  source: "walk_in",
  sourceNote: "Dubai office",
  referralType: "none",
  referrerStaffId: "",
  referrerClientName: "",
  referralProofNote: "",
  inspectionScheduledAt: "",
  make: "Toyota",
  model: "Camry",
  trim: "SE",
  year: "2024",
  mileageKm: "12000",
  specification: "GCC Specs",
  optionLevel: "Mid Mode",
  emirate: "Dubai",
  notes: "Requested a callback.",
};

describe("manualLeadSchema", () => {
  it("accepts a complete staff-entered lead and coerces numeric fields", () => {
    const result = manualLeadSchema.parse(validLead);
    expect(result.year).toBe(2024);
    expect(result.mileageKm).toBe(12000);
  });

  it("rejects an unknown intake source", () => {
    expect(manualLeadSchema.safeParse({ ...validLead, source: "social_media" }).success).toBe(false);
  });

  it("requires an employee and written proof for an employee referral", () => {
    expect(manualLeadSchema.safeParse({ ...validLead, referralType: "employee" }).success).toBe(false);
    expect(manualLeadSchema.safeParse({
      ...validLead,
      referralType: "employee",
      referrerStaffId: "4f0a52a0-5f55-4d13-afbb-52957ca1c123",
      referralProofNote: "Customer confirmed that the employee referred them.",
    }).success).toBe(true);
  });

  it("rejects invalid phone and future model year", () => {
    const result = manualLeadSchema.safeParse({ ...validLead, phone: "123", year: "2099" });
    expect(result.success).toBe(false);
  });

  it("accepts an optional inspection booking", () => {
    const result = manualLeadSchema.safeParse({ ...validLead, inspectionScheduledAt: "2026-09-20T10:30" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid inspection booking", () => {
    expect(manualLeadSchema.safeParse({ ...validLead, inspectionScheduledAt: "not-a-date" }).success).toBe(false);
  });
});
