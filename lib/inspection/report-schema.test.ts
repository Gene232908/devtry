import { describe, expect, it } from "vitest";
import {
  EMPTY_INSPECTION_REPORT,
  EXTERNAL_BODY_ITEMS,
  inspectionReportSchema,
  inspectionDraftSchema,
  isCompleteInspectionReport,
  normalizeInspectionDraft,
  MECHANICAL_ITEMS,
  PHOTO_ANGLES,
  SCRAP_PHOTO_REQUIREMENTS,
  SCRAP_PHOTO_ANGLES,
} from "@/lib/inspection/report-schema";

function completedData() {
  const pass = Object.fromEntries([...EXTERNAL_BODY_ITEMS, ...MECHANICAL_ITEMS].map((item) => [item, "pass"]));
  return inspectionReportSchema.parse({
    ...EMPTY_INSPECTION_REPORT,
    carMake: "Jetour",
    carModel: "T2",
    modelYear: "2025",
    carSpecification: "GCC Specs",
    mileageKm: "35000",
    externalBody: Object.fromEntries(EXTERNAL_BODY_ITEMS.map((item) => [item, pass[item]])),
    mechanical: Object.fromEntries(MECHANICAL_ITEMS.map((item) => [item, pass[item]])),
    tyres: {
      ...EMPTY_INSPECTION_REPORT.tyres,
      driverFront: { result: "pass", year: "2025", note: "" },
      driverRear: { result: "pass", year: "2025", note: "" },
      passengerFront: { result: "pass", year: "2025", note: "" },
      passengerRear: { result: "pass", year: "2025", note: "" },
    },
  });
}

describe("isCompleteInspectionReport", () => {
  it("requires 24 photo angles including both bumper close-ups", () => {
    expect(PHOTO_ANGLES).toHaveLength(24);
    expect(PHOTO_ANGLES).toContain("Front bumper");
    expect(PHOTO_ANGLES).toContain("Rear bumper");
  });
  it("accepts in-progress numeric values for a draft", () => {
    const draft = inspectionDraftSchema.parse({ ...EMPTY_INSPECTION_REPORT, modelYear: "20", mileageKm: "3" });
    expect(draft.modelYear).toBe("20");
    expect(draft.mileageKm).toBe("3");
  });
  it("normalizes legacy reports that predate nested inspection fields", () => {
    const result = inspectionDraftSchema.safeParse(normalizeInspectionDraft({ carMake: "Toyota", tyres: {} }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tyres.driverFront.year).toBe("");
  });
  it("accepts a fully documented inspection", () => {
    expect(isCompleteInspectionReport(completedData(), PHOTO_ANGLES)).toBe(true);
  });

  it("rejects an inspection with an unanswered condition check", () => {
    const data = completedData();
    data.mechanical[MECHANICAL_ITEMS[0]] = undefined;
    expect(isCompleteInspectionReport(data, PHOTO_ANGLES)).toBe(false);
  });

  it("rejects a failed item without its required explanation", () => {
    const data = completedData();
    data.externalBody[EXTERNAL_BODY_ITEMS[0]] = "fail";
    expect(isCompleteInspectionReport(data, PHOTO_ANGLES)).toBe(false);
  });

  it("rejects a tyre without a year and a missing photo", () => {
    const data = completedData();
    data.tyres.driverFront.year = "";
    expect(isCompleteInspectionReport(data, PHOTO_ANGLES.slice(1))).toBe(false);
  });

  describe("Scrap Inquiry 10 inspection items", () => {
    it("contains exactly the 10 approved inspection items in the exact specified order", () => {
      const titles = SCRAP_PHOTO_REQUIREMENTS.map((req) => req.title);
      expect(titles).toEqual([
        "Front of car",
        "Full left side",
        "Full right side",
        "Rear of car",
        "Bonnet",
        "Roof",
        "Dashboard and mileage",
        "Front seats",
        "Rear seats",
        "Engine bay",
      ]);
      expect(SCRAP_PHOTO_REQUIREMENTS).toHaveLength(10);
      expect(SCRAP_PHOTO_ANGLES).toHaveLength(10);
    });

    it("completes a scrap inquiry inspection when all 10 scrap photos are present and checks are satisfied", () => {
      expect(isCompleteInspectionReport(completedData(), SCRAP_PHOTO_ANGLES, "scrap")).toBe(true);
    });

    it("rejects a scrap inquiry inspection if any of the 10 items is missing", () => {
      expect(isCompleteInspectionReport(completedData(), SCRAP_PHOTO_ANGLES.slice(0, 9), "scrap")).toBe(false);
    });

    it("keeps valuation inspection requirement intact (requires 24 photos)", () => {
      expect(isCompleteInspectionReport(completedData(), SCRAP_PHOTO_ANGLES, "valuation")).toBe(false);
      expect(isCompleteInspectionReport(completedData(), PHOTO_ANGLES, "valuation")).toBe(true);
    });
  });
});
