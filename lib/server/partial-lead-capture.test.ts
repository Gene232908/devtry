import { describe, expect, it } from "vitest";
import { canRetryLegacyCapture, parseCaptureRevision, parseCaptureSessionId } from "./partial-lead-capture";

describe("partial lead capture session ids", () => {
  it("accepts and normalizes a canonical UUID", () => {
    expect(parseCaptureSessionId(" 550E8400-E29B-41D4-A716-446655440000 ")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("rejects missing, malformed, and non-RFC variant values", () => {
    expect(parseCaptureSessionId(undefined)).toBeNull();
    expect(parseCaptureSessionId("not-a-uuid")).toBeNull();
    expect(parseCaptureSessionId("550e8400-e29b-41d4-0716-446655440000")).toBeNull();
  });
});

describe("partial lead capture revisions", () => {
  it("supports legacy requests and bounded integer revisions", () => {
    expect(parseCaptureRevision(undefined)).toBe(0);
    expect(parseCaptureRevision(17)).toBe(17);
    expect(parseCaptureRevision("23")).toBe(23);
  });

  it("rejects negative, fractional, and excessive revisions", () => {
    expect(parseCaptureRevision(-1)).toBeNull();
    expect(parseCaptureRevision(1.5)).toBeNull();
    expect(parseCaptureRevision(1_000_001)).toBeNull();
    expect(parseCaptureRevision("2.5")).toBeNull();
  });
});

describe("partial lead capture deployment fallback", () => {
  it("retries both inquiry types when only migration 0041 is missing", () => {
    const message = "Could not find p_capture_session_id and p_capture_revision";
    expect(canRetryLegacyCapture(message, "valuation")).toBe(true);
    expect(canRetryLegacyCapture(message, "scrap")).toBe(true);
  });

  it("never sends Scrap to a pre-Scrap RPC signature", () => {
    const message = "Could not find p_inquiry_type in capture_partial_lead";
    expect(canRetryLegacyCapture(message, "valuation")).toBe(true);
    expect(canRetryLegacyCapture(message, "scrap")).toBe(false);
  });

  it("does not retry unrelated database failures", () => {
    expect(canRetryLegacyCapture("database unavailable", "valuation")).toBe(false);
    expect(canRetryLegacyCapture("database unavailable", "scrap")).toBe(false);
  });
});

