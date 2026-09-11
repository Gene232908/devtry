import { afterEach, describe, expect, it } from "vitest";
import { formatNewLeadText, isLeadNotificationConfigured } from "@/lib/server/lead-notifications";

const originalUser = process.env.LEAD_NOTIFICATION_SMTP_USER;
const originalPassword = process.env.LEAD_NOTIFICATION_SMTP_APP_PASSWORD;
const originalLegacyUser = process.env.GMAIL_SMTP_USER;
const originalLegacyPassword = process.env.GMAIL_SMTP_APP_PASSWORD;

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("LEAD_NOTIFICATION_SMTP_USER", originalUser);
  restore("LEAD_NOTIFICATION_SMTP_APP_PASSWORD", originalPassword);
  restore("GMAIL_SMTP_USER", originalLegacyUser);
  restore("GMAIL_SMTP_APP_PASSWORD", originalLegacyPassword);
});

describe("lead notification SMTP configuration", () => {
  it("requires both a sender email and an app password", () => {
    delete process.env.LEAD_NOTIFICATION_SMTP_USER;
    delete process.env.LEAD_NOTIFICATION_SMTP_APP_PASSWORD;
    delete process.env.GMAIL_SMTP_USER;
    delete process.env.GMAIL_SMTP_APP_PASSWORD;

    expect(isLeadNotificationConfigured()).toBe(false);
  });

  it("accepts a Gmail app password copied with spaces", () => {
    process.env.LEAD_NOTIFICATION_SMTP_USER = "sender@example.com";
    process.env.LEAD_NOTIFICATION_SMTP_APP_PASSWORD = "abcd efgh ijkl mnop";

    expect(isLeadNotificationConfigured()).toBe(true);
  });

  it("does not include an email line because valuation leads do not collect email addresses", () => {
    const text = formatNewLeadText({
      id: "lead-1",
      fullName: "Ahmed Al Mansoori",
      phoneE164: "+639763331768",
      email: null,
      make: "Range Rover",
      model: "Sport",
      trim: "HSE",
      year: 2026,
      mileageKm: 35_000,
      emirate: "Abu Dhabi",
      createdAt: "2026-09-11T00:47:16.000Z",
    });

    expect(text).toContain("Customer: Ahmed Al Mansoori");
    expect(text).toContain("Vehicle: 2026 Range Rover Sport HSE");
    expect(text).not.toContain("Email:");
    expect(text).not.toContain("Not provided");
  });
});
