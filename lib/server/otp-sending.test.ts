import { afterEach, describe, expect, it } from "vitest";
import { isWhatsappOtpSendingEnabled } from "./otp-sending";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isWhatsappOtpSendingEnabled", () => {
  it("keeps OTP sending enabled when the emergency switch is unset", () => {
    delete process.env.WHATSAPP_OTP_SENDING_ENABLED;
    expect(isWhatsappOtpSendingEnabled()).toBe(true);
  });

  it("disables OTP sending only when explicitly set to false", () => {
    process.env.WHATSAPP_OTP_SENDING_ENABLED = "false";
    expect(isWhatsappOtpSendingEnabled()).toBe(false);
  });

  it("accepts a safely formatted false value", () => {
    process.env.WHATSAPP_OTP_SENDING_ENABLED = " FALSE ";
    expect(isWhatsappOtpSendingEnabled()).toBe(false);
  });
});
