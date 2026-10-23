import { afterEach, describe, expect, it } from "vitest";
import {
  formatNewLeadText,
  formatCustomerArrivalText,
  formatCustomerArrivalHtml,
  formatArrivalReversalText,
  formatArrivalReversalHtml,
  isLeadNotificationConfigured,
} from "@/lib/server/lead-notifications";

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

  it("formats arrival notification text with vehicle, purchaser, time, and inquiry type", () => {
    const textValuation = formatCustomerArrivalText({
      leadId: "lead-123",
      customerName: "Mohammed Al Hashimi",
      vehicle: "2026 Jetour T2 Luxury",
      purchaserName: "Purchaser John",
      confirmedByName: "Agent Sarah",
      arrivedAt: "20 Oct 2026, 17:30 (UAE)",
      inquiryType: "valuation",
    });

    expect(textValuation).toContain("Inquiry Type: Valuation Lead");
    expect(textValuation).toContain("Customer Name: Mohammed Al Hashimi");
    expect(textValuation).toContain("Vehicle: 2026 Jetour T2 Luxury");
    expect(textValuation).toContain("Assigned Purchaser: Purchaser John");
    expect(textValuation).toContain("Confirmed By: Agent Sarah");
    expect(textValuation).toContain("Arrival Time: 20 Oct 2026, 17:30 (UAE)");
    expect(textValuation).toContain("/admin/leads/lead-123");

    const textScrap = formatCustomerArrivalText({
      leadId: "lead-789",
      customerName: "Rashid Salem",
      vehicle: "2018 Toyota Corolla",
      purchaserName: "Purchaser Ali",
      confirmedByName: "Agent Sarah",
      arrivedAt: "23 Oct 2026, 12:00 (UAE)",
      inquiryType: "scrap",
    });

    expect(textScrap).toContain("[Scrap Inquiry]");
    expect(textScrap).toContain("Inquiry Type: Scrap Inquiry");
    expect(textScrap).toContain("/admin/leads/lead-789?origin=scrap");

    const htmlValuation = formatCustomerArrivalHtml({
      leadId: "lead-123",
      customerName: "Mohammed Al Hashimi",
      vehicle: "2026 Jetour T2 Luxury",
      purchaserName: "Purchaser John",
      confirmedByName: "Agent Sarah",
      arrivedAt: "20 Oct 2026, 17:30 (UAE)",
      inquiryType: "valuation",
    });

    expect(htmlValuation).toContain("Valuation Lead");
    expect(htmlValuation).toContain("Mohammed Al Hashimi");
    expect(htmlValuation).toContain("2026 Jetour T2 Luxury");
    expect(htmlValuation).toContain("Purchaser John");
    expect(htmlValuation).toContain("/admin/leads/lead-123");

    const htmlScrap = formatCustomerArrivalHtml({
      leadId: "lead-789",
      customerName: "Rashid Salem",
      vehicle: "2018 Toyota Corolla",
      purchaserName: "Purchaser Ali",
      confirmedByName: "Agent Sarah",
      arrivedAt: "23 Oct 2026, 12:00 (UAE)",
      inquiryType: "scrap",
    });

    expect(htmlScrap).toContain("Scrap / Salvage Inquiry");
    expect(htmlScrap).toContain("Scrap Inquiry (Salvage Vehicle)");
    expect(htmlScrap).toContain("/admin/leads/lead-789?origin=scrap");
  });

  it("formats arrival reversal approval request notification for Sir Nash", () => {
    const text = formatArrivalReversalText({
      leadId: "lead-456",
      customerName: "Sultan Al Qasimi",
      vehicle: "2024 Nissan Patrol",
      requesterName: "Agent1",
      requesterRole: "call_center",
      reason: "Customer rescheduled to tomorrow; clicked arrival by mistake",
      requestedAt: "22 Oct 2026, 01:45 (UAE)",
      inquiryType: "scrap",
    });

    expect(text).toContain("Arrival Reversal Approval Request [Scrap Inquiry]");
    expect(text).toContain("Inquiry Type: Scrap Inquiry");
    expect(text).toContain("Agent1 (Customer Service (Call Centre))");
    expect(text).toContain("Sultan Al Qasimi");
    expect(text).toContain("2024 Nissan Patrol");
    expect(text).toContain("Customer rescheduled to tomorrow");
    expect(text).toContain("/admin/leads/lead-456?origin=scrap");

    const html = formatArrivalReversalHtml({
      leadId: "lead-456",
      customerName: "Sultan Al Qasimi",
      vehicle: "2024 Nissan Patrol",
      requesterName: "Agent1",
      requesterRole: "call_center",
      reason: "Customer rescheduled to tomorrow; clicked arrival by mistake",
      requestedAt: "22 Oct 2026, 01:45 (UAE)",
      inquiryType: "valuation",
    });

    expect(html).toContain("Customer Arrival Reversal Request");
    expect(html).toContain("Valuation Lead");
    expect(html).toContain("Agent1");
    expect(html).toContain("Customer Service (Call Centre)");
    expect(html).toContain("Sultan Al Qasimi");
    expect(html).toContain("/admin/leads/lead-456");
  });
});
