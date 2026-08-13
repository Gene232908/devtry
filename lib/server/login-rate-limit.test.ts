import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkLoginRateLimit,
  hashEmail,
  hashLoginIp,
  LOGIN_LIMITS,
  normaliseEmail,
} from "./login-rate-limit";

// A Supabase stand-in exposing only .rpc(), which is all the limiter uses.
function fakeSupabase(rpc: (name: string, args: unknown) => unknown): SupabaseClient {
  return { rpc: vi.fn(rpc) } as unknown as SupabaseClient;
}

describe("normaliseEmail", () => {
  it("collapses case and surrounding whitespace into one bucket", () => {
    expect(normaliseEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });

  it("keeps dots and +tags, which are not universally aliases", () => {
    expect(normaliseEmail("a.b+tag@example.com")).toBe("a.b+tag@example.com");
  });
});

describe("hashEmail", () => {
  it("gives case and whitespace variants the SAME hash, so they share an allowance", () => {
    expect(hashEmail("Owner@Example.com")).toBe(hashEmail("  owner@example.com  "));
  });

  it("gives different addresses different hashes", () => {
    expect(hashEmail("a@example.com")).not.toBe(hashEmail("b@example.com"));
  });

  it("never contains the address in readable form", () => {
    expect(hashEmail("owner@example.com")).not.toContain("owner");
    expect(hashEmail("owner@example.com")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("hashLoginIp", () => {
  it("returns null for an unknown IP rather than bucketing everyone together", () => {
    expect(hashLoginIp(null)).toBeNull();
  });

  it("hashes rather than storing the raw address", () => {
    const hashed = hashLoginIp("203.0.113.7");
    expect(hashed).not.toContain("203.0.113.7");
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is stable and distinct per address", () => {
    expect(hashLoginIp("1.2.3.4")).toBe(hashLoginIp("1.2.3.4"));
    expect(hashLoginIp("1.2.3.4")).not.toBe(hashLoginIp("1.2.3.5"));
  });
});

describe("checkLoginRateLimit", () => {
  it("allows an attempt the store accepts", async () => {
    const sb = fakeSupabase(() => ({
      data: [{ allowed: true, email_fail_count: 1, ip_fail_count: 1, retry_after_secs: 0 }],
      error: null,
    }));
    const decision = await checkLoginRateLimit(sb, "owner@example.com", "iphash");
    expect(decision.allowed).toBe(true);
  });

  it("refuses once the store says the limit is reached, with a real wait", async () => {
    const sb = fakeSupabase(() => ({
      data: [{ allowed: false, email_fail_count: 5, ip_fail_count: 5, retry_after_secs: 240 }],
      error: null,
    }));
    const decision = await checkLoginRateLimit(sb, "owner@example.com", "iphash");
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSecs).toBe(240);
  });

  it("passes the configured limits and normalised email hash to the RPC", async () => {
    const rpc = vi.fn(() => ({
      data: [{ allowed: true, email_fail_count: 0, ip_fail_count: 0, retry_after_secs: 0 }],
      error: null,
    }));
    const sb = { rpc } as unknown as SupabaseClient;

    await checkLoginRateLimit(sb, "  Owner@Example.com ", "iphash");

    expect(rpc).toHaveBeenCalledWith("record_login_attempt", {
      p_email_hash: hashEmail("owner@example.com"),
      p_ip_hash: "iphash",
      p_email_limit: LOGIN_LIMITS.emailIp,
      p_ip_limit: LOGIN_LIMITS.ip,
      p_window_secs: LOGIN_LIMITS.windowSecs,
    });
  });

  it("FAILS CLOSED when the store errors — an outage must not remove the protection", async () => {
    const sb = fakeSupabase(() => ({ data: null, error: { message: "connection refused" } }));
    const decision = await checkLoginRateLimit(sb, "owner@example.com", "iphash");
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSecs).toBeGreaterThan(0);
  });

  it("fails closed when the store returns no decision row", async () => {
    const sb = fakeSupabase(() => ({ data: [], error: null }));
    const decision = await checkLoginRateLimit(sb, "owner@example.com", "iphash");
    expect(decision.allowed).toBe(false);
  });

  it("never reports a zero wait when refusing, so a client cannot retry instantly", async () => {
    const sb = fakeSupabase(() => ({
      data: [{ allowed: false, email_fail_count: 9, ip_fail_count: 0, retry_after_secs: 0 }],
      error: null,
    }));
    const decision = await checkLoginRateLimit(sb, "owner@example.com", "iphash");
    expect(decision.retryAfterSecs).toBeGreaterThanOrEqual(1);
  });

  it("keeps the per-IP ceiling looser than the per-account limit (shared office IPs)", () => {
    expect(LOGIN_LIMITS.ip).toBeGreaterThan(LOGIN_LIMITS.emailIp);
  });
});
