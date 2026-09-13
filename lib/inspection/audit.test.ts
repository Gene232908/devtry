import { describe, expect, it } from "vitest";
import { inspectionChangedCards } from "@/lib/inspection/audit";
import { EMPTY_INSPECTION_REPORT } from "@/lib/inspection/report-schema";

describe("inspectionChangedCards", () => {
  it("records only the inspection cards whose values changed", () => {
    const after = {
      ...EMPTY_INSPECTION_REPORT,
      chassisNumber: "VIN-123",
      mechanical: { Steering: "pass" as const },
    };
    expect(inspectionChangedCards(EMPTY_INSPECTION_REPORT, after)).toEqual([
      "Vehicle and registration",
      "Mechanical Components",
    ]);
  });

  it("does not create activity noise when a save changes nothing", () => {
    expect(inspectionChangedCards(EMPTY_INSPECTION_REPORT, EMPTY_INSPECTION_REPORT)).toEqual([]);
  });
});
