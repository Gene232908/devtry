import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };
afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

describe("POST /api/otp/verify while public OTP is paused", () => {
  it("rejects before reading a code or accessing the database", async () => {
    process.env.PUBLIC_LEAD_VERIFICATION_MODE = "unverified";
    const response = await POST(new NextRequest("http://localhost/api/otp/verify", {
      method: "POST",
      body: "not json",
    }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.kind).toBe("otp_sending_disabled");
  });
});
