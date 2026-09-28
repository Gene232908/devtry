import { describe, expect, it } from "vitest";
import { arrivalResetForRescheduledInspection } from "./inspection-reschedule";

describe("arrivalResetForRescheduledInspection", () => {
  it.each(["Regular lead", "Scrap inquiry"])("resets confirmed arrival when a %s appointment moves", () => {
    expect(arrivalResetForRescheduledInspection(
      "2026-09-27T19:20:00.000Z",
      "2026-09-28T09:00:00.000Z",
      "arrived",
    )).toEqual({ arrival_status: "not_arrived", arrived_at: null, arrived_by: null });
  });

  it("preserves confirmed arrival for an unchanged appointment", () => {
    expect(arrivalResetForRescheduledInspection(
      "2026-09-27T19:20:00.000Z",
      "2026-09-27T19:20:00.000Z",
      "arrived",
    )).toBeNull();
  });

  it("does not create a reset for a first appointment or an unconfirmed arrival", () => {
    expect(arrivalResetForRescheduledInspection(null, "2026-09-27T19:20:00.000Z", "not_arrived")).toBeNull();
    expect(arrivalResetForRescheduledInspection("2026-09-27T19:20:00.000Z", "2026-09-28T09:00:00.000Z", "not_arrived")).toBeNull();
  });
});
