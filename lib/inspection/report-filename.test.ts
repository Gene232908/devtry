import { describe, expect, it } from "vitest";
import { inspectionReportFilename, inspectionReportTitle } from "@/lib/inspection/report-filename";

describe("inspection report naming", () => {
  it("uses the requested make, model, and model-year format", () => {
    const vehicle = { carMake: "Jetour", carModel: "T2 Luxury", modelYear: "2025" };
    expect(inspectionReportTitle(vehicle)).toBe("Inspection Report For - Jetour T2 Luxury 2025");
    expect(inspectionReportFilename(vehicle)).toBe("Inspection Report For - Jetour T2 Luxury 2025.pdf");
  });

  it("removes characters that Windows does not allow in filenames", () => {
    expect(inspectionReportFilename({ carMake: "Make/Name", carModel: "Model:One", modelYear: 2026 }))
      .toBe("Inspection Report For - MakeName ModelOne 2026.pdf");
  });
});
