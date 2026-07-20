import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { issueOtpProof, readOtpProof } from "./otp-proof";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.OTP_HASH_SECRET = "test-secret-do-not-use-in-prod";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.useRealTimers();
});

const PARAMS = { verificationId: "11111111-1111-1111-1111-111111111111", sessionId: "session-abc", phone: "+971501234567" };

describe("issueOtpProof / readOtpProof", () => {
  it("round-trips a valid proof for the matching phone", () => {
    const proof = issueOtpProof(PARAMS);
    const payload = readOtpProof(proof, PARAMS.phone);
    expect(payload).not.toBeNull();
    expect(payload?.verificationId).toBe(PARAMS.verificationId);
    expect(payload?.sessionId).toBe(PARAMS.sessionId);
  });

  it("rejects the proof when checked against a different phone number", () => {
    const proof = issueOtpProof(PARAMS);
    expect(readOtpProof(proof, "+971559999999")).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(readOtpProof("not-a-real-token", PARAMS.phone)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const proof = issueOtpProof(PARAMS);
    const [encoded] = proof.split(".");
    const tampered = `${encoded}.invalidsignature000000000000000000000000000`;
    expect(readOtpProof(tampered, PARAMS.phone)).toBeNull();
  });

  it("rejects a tampered payload (e.g. swapped verificationId) even with the original signature", () => {
    const proof = issueOtpProof(PARAMS);
    const [, signature] = proof.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...PARAMS, verificationId: "attacker-controlled-id", exp: Date.now() + 60_000 }),
    ).toString("base64url");
    expect(readOtpProof(`${forgedPayload}.${signature}`, PARAMS.phone)).toBeNull();
  });

  it("rejects an expired proof", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const proof = issueOtpProof(PARAMS);

    vi.setSystemTime(new Date("2026-01-01T00:11:00.000Z")); // 11 minutes later, past the 10-minute TTL
    expect(readOtpProof(proof, PARAMS.phone)).toBeNull();
  });

  it("accepts a proof still within its expiry window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const proof = issueOtpProof(PARAMS);

    vi.setSystemTime(new Date("2026-01-01T00:09:00.000Z")); // 9 minutes later, still within the 10-minute TTL
    expect(readOtpProof(proof, PARAMS.phone)).not.toBeNull();
  });
});
