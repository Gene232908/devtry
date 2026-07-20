import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "./otp-hash";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.OTP_HASH_SECRET = "test-secret-do-not-use-in-prod";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("generateOtpCode", () => {
  it("generates a 6-digit numeric string", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes across calls (not deterministic)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hashOtpCode / verifyOtpCode", () => {
  it("never stores the plain code as the hash", () => {
    const code = "123456";
    expect(hashOtpCode(code)).not.toBe(code);
  });

  it("verifies successfully against the correct code", () => {
    const code = "654321";
    const hash = hashOtpCode(code);
    expect(verifyOtpCode(code, hash)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const hash = hashOtpCode("111111");
    expect(verifyOtpCode("222222", hash)).toBe(false);
  });

  it("produces different hashes for different secrets (defense in depth)", () => {
    const code = "123456";
    const hashA = hashOtpCode(code);
    process.env.OTP_HASH_SECRET = "a-different-secret";
    const hashB = hashOtpCode(code);
    expect(hashA).not.toBe(hashB);
  });
});
