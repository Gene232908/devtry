import { describe, expect, it } from "vitest";
import { PARTIAL_STATUSES } from "@/lib/admin/partial-lead";

describe("incomplete-form CSR statuses", () => {
  it("keeps buying outcomes out of the CSR menu", () => {
    expect(PARTIAL_STATUSES).toEqual(["new", "pending", "contacted", "inspection_scheduled"]);
    expect(PARTIAL_STATUSES).not.toContain("deal");
    expect(PARTIAL_STATUSES).not.toContain("closed");
  });
});
