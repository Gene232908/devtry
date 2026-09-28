import { describe, expect, it } from "vitest";
import { PARTIAL_STATUSES, partialInquiryType } from "@/lib/admin/partial-lead";

describe("incomplete-form CSR statuses", () => {
  it("keeps buying outcomes out of the CSR menu", () => {
    expect(PARTIAL_STATUSES).toEqual(["new", "contacted", "inspection_scheduled"]);
    expect(PARTIAL_STATUSES).not.toContain("pending");
    expect(PARTIAL_STATUSES).not.toContain("deal");
    expect(PARTIAL_STATUSES).not.toContain("closed");
  });
});

describe("incomplete inquiry origin", () => {
  it("treats legacy data as valuation and preserves an explicit Scrap origin", () => {
    expect(partialInquiryType({})).toBe("valuation");
    expect(partialInquiryType({ inquiry_type: "scrap" })).toBe("scrap");
  });
});
