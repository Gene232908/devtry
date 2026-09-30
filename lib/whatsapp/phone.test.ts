import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { normalizeWhatsappPhone, isAllowedWhatsappRecipient } from "./phone";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("normalizeWhatsappPhone — always recognizes both shapes (mode-independent, safe for client code)", () => {
  it("normalizes a local 05... UAE number", () => {
    expect(normalizeWhatsappPhone("0501234567")).toBe("+971501234567");
  });

  it("normalizes a country-code UAE number without +", () => {
    expect(normalizeWhatsappPhone("971501234567")).toBe("+971501234567");
  });

  it("normalizes a full +971 UAE number", () => {
    expect(normalizeWhatsappPhone("+971501234567")).toBe("+971501234567");
  });

  it("rejects an invalid UAE-shaped number", () => {
    expect(normalizeWhatsappPhone("12345")).toBeNull();
    expect(normalizeWhatsappPhone("051231231231")).toBeNull();
  });

  it("normalizes a local 09... PH number regardless of WHATSAPP_TEST_MODE", () => {
    delete process.env.WHATSAPP_TEST_MODE;
    expect(normalizeWhatsappPhone("09171234567")).toBe("+639171234567");
  });

  it("normalizes a full +63 PH number regardless of WHATSAPP_TEST_MODE", () => {
    process.env.WHATSAPP_TEST_MODE = "false";
    expect(normalizeWhatsappPhone("+639171234567")).toBe("+639171234567");
  });
});

describe("isAllowedWhatsappRecipient — production mode (WHATSAPP_TEST_MODE=false)", () => {
  beforeEach(() => {
    process.env.WHATSAPP_TEST_MODE = "false";
  });

  it("allows a valid UAE number", () => {
    expect(isAllowedWhatsappRecipient("+971501234567")).toBe(true);
  });

  it("rejects a PH number in production", () => {
    expect(isAllowedWhatsappRecipient("+639171234567")).toBe(false);
  });
});

describe("isAllowedWhatsappRecipient — test mode with an explicit allow-list", () => {
  beforeEach(() => {
    process.env.WHATSAPP_TEST_MODE = "true";
    process.env.WHATSAPP_TEST_RECIPIENTS = "+639171234567,+639991112222";
  });

  it("allows a UAE number outright (the real target audience)", () => {
    expect(isAllowedWhatsappRecipient("+971501234567")).toBe(true);
  });

  it("allows an explicitly allow-listed PH test recipient", () => {
    expect(isAllowedWhatsappRecipient("+639171234567")).toBe(true);
  });

  it("rejects a non-allow-listed PH number", () => {
    expect(isAllowedWhatsappRecipient("+639998887777")).toBe(false);
  });
});

describe("isAllowedWhatsappRecipient — temporary relaxation while WHATSAPP_TEST_RECIPIENTS is unset", () => {
  beforeEach(() => {
    process.env.WHATSAPP_TEST_MODE = "true";
    process.env.WHATSAPP_TEST_RECIPIENTS = "";
  });

  it("allows any valid PH number when no allow-list is configured yet", () => {
    expect(isAllowedWhatsappRecipient("+639171234567")).toBe(true);
  });

  it("still allows UAE numbers", () => {
    expect(isAllowedWhatsappRecipient("+971501234567")).toBe(true);
  });

  it("returns to strict allow-listing once WHATSAPP_TEST_RECIPIENTS is configured", () => {
    process.env.WHATSAPP_TEST_RECIPIENTS = "+639998887767";
    expect(isAllowedWhatsappRecipient("+639171234567")).toBe(false);
    expect(isAllowedWhatsappRecipient("+639998887767")).toBe(true);
  });
});
