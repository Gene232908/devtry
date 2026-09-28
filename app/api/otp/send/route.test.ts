import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sendWhatsappOtp: vi.fn() }));

vi.mock("@/lib/whatsapp/send-otp", () => ({
  sendWhatsappOtp: mocks.sendWhatsappOtp,
  WhatsappError: class WhatsappError extends Error {
    kind = "otp_send_failed";
  },
}));

import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, WHATSAPP_OTP_SENDING_ENABLED: "false" };
  mocks.sendWhatsappOtp.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/otp/send emergency switch", () => {
  it("stops before parsing, persisting, or sending an OTP", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/otp/send", {
        method: "POST",
        body: "not valid json",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        kind: "otp_sending_disabled",
        message: "WhatsApp verification is temporarily unavailable. Please try again later.",
      },
    });
    expect(mocks.sendWhatsappOtp).not.toHaveBeenCalled();
  });

  it("does not send in unverified mode even if the legacy sender switch is on", async () => {
    process.env.PUBLIC_LEAD_VERIFICATION_MODE = "unverified";
    process.env.WHATSAPP_OTP_SENDING_ENABLED = "true";
    const response = await POST(new NextRequest("http://localhost/api/otp/send", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
    expect(mocks.sendWhatsappOtp).not.toHaveBeenCalled();
  });
});
