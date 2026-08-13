import { describe, expect, it } from "vitest";
import { fieldErrors, settingsSchema } from "./settings-schema";

describe("settingsSchema", () => {
  const valid = {
    whatsappNumber: "+971564145781",
    callNumber: "+971564145781",
    notifyEmail: "owner@carvibedubai.com",
  };

  it("accepts a complete, well-formed payload", () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
  });

  it("treats an empty notify email as notifications off, not an error", () => {
    const parsed = settingsSchema.safeParse({ ...valid, notifyEmail: "" });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed email rather than storing it", () => {
    const parsed = settingsSchema.safeParse({ ...valid, notifyEmail: "not-an-email" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a phone number without a country code", () => {
    const parsed = settingsSchema.safeParse({ ...valid, whatsappNumber: "0564145781" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty required phone number", () => {
    expect(settingsSchema.safeParse({ ...valid, callNumber: "" }).success).toBe(false);
  });

  it("trims surrounding whitespace before storing", () => {
    const parsed = settingsSchema.safeParse({ ...valid, whatsappNumber: "  +971564145781  " });
    expect(parsed.success && parsed.data.whatsappNumber).toBe("+971564145781");
  });

  // The "Buy a car" toggle was removed because nothing read it: the public
  // "Coming Soon" button is hard-coded, so saving the value changed nothing on
  // the site. If it is ever reinstated it must be wired to the public page at
  // the same time, and this test should be the thing that fails first.
  it("does not accept a buyACarEnabled value, and never emits one", () => {
    const parsed = settingsSchema.safeParse({ ...valid, buyACarEnabled: true });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "buyACarEnabled" in parsed.data).toBe(false);
  });

  it("reports one message per field for the form to render", () => {
    const parsed = settingsSchema.safeParse({ ...valid, whatsappNumber: "bad", notifyEmail: "also-bad" });
    if (parsed.success) throw new Error("expected the payload to be rejected");
    const errors = fieldErrors(parsed.error);
    expect(Object.keys(errors).sort()).toEqual(["notifyEmail", "whatsappNumber"]);
    expect(errors.whatsappNumber).toBeTruthy();
  });
});
