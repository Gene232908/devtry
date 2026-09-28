import { afterEach, describe, expect, it } from "vitest";
import { getPublicLeadVerificationMode } from "./public-lead-verification";

const ORIGINAL_ENV = { ...process.env };
afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

describe("public lead verification mode", () => {
  it("defaults to the approved temporary pause", () => {
    delete process.env.PUBLIC_LEAD_VERIFICATION_MODE;
    expect(getPublicLeadVerificationMode()).toBe("unverified");
  });
  it("can restore OTP explicitly", () => {
    process.env.PUBLIC_LEAD_VERIFICATION_MODE = "otp";
    expect(getPublicLeadVerificationMode()).toBe("otp");
  });
  it("rejects unknown modes", () => {
    process.env.PUBLIC_LEAD_VERIFICATION_MODE = "disabled";
    expect(() => getPublicLeadVerificationMode()).toThrow("Invalid PUBLIC_LEAD_VERIFICATION_MODE");
  });
});
