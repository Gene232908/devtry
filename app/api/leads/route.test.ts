import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  blocked: false,
  openStatus: null as string | null,
  insertError: false,
  notifyEmail: "",
  inserted: [] as Record<string, unknown>[],
  converted: [] as Record<string, unknown>[],
  events: [] as Record<string, unknown>[],
  isRateLimited: vi.fn(() => false),
  sendNewLeadNotification: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => ({
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let inserted: Record<string, unknown> | null = null;
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        gte: () => query,
        order: () => query,
        limit: () => query,
        update: () => query,
        insert: (row: Record<string, unknown>) => {
          inserted = row;
          if (table === "lead_events") mocks.events.push(row);
          return query;
        },
        maybeSingle: async () => {
          if (table === "blocked_numbers") return { data: mocks.blocked ? { phone_e164: filters.phone_e164 } : null, error: null };
          if (table === "vehicle_specifications") return { data: { id: "spec" }, error: null };
          if (table === "settings") return { data: { notify_email: mocks.notifyEmail }, error: null };
          if (table === "leads" && filters.id) return { data: mocks.rows.get(String(filters.id)) ?? null, error: null };
          if (table === "leads") return { data: mocks.openStatus ? { status: mocks.openStatus } : null, error: null };
          return { data: null, error: null };
        },
        single: async () => {
          if (table !== "leads" || !inserted) return { data: null, error: { message: "unexpected insert" } };
          if (mocks.insertError) return { data: null, error: { message: "database unavailable" } };
          const row = inserted as Record<string, unknown>;
          mocks.inserted.push(row);
          mocks.rows.set(String(row.id), row);
          return { data: { id: row.id, created_at: new Date().toISOString() }, error: null };
        },
        then: (resolve: (value: unknown) => void) => {
          resolve(table === "leads" ? { count: 0, error: null } : { data: null, error: null });
        },
      };
      return query;
    },
    rpc: async (_name: string, args: Record<string, unknown>) => {
      mocks.converted.push(args);
      return { data: null, error: null };
    },
  }),
}));
vi.mock("@/lib/server/lead-assignment", () => ({ pickNextAssignee: async () => null }));
vi.mock("@/lib/server/lead-notifications", () => ({ sendNewLeadNotification: mocks.sendNewLeadNotification }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mocks.isRateLimited }));

import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };
const base = {
  submissionId: "d32cf411-309e-4db0-8fde-d8e0304c457b",
  inquiryType: "valuation",
  fullName: "Test Person",
  whatsapp: "0501234567",
  make: "Toyota",
  model: "Camry",
  trim: "Standard",
  year: "2024",
  mileageKm: "15000",
  mileageUnit: "km",
  specification: "GCC Specs",
  description: "",
  optionLevel: "Basic Mode",
  location: "Dubai",
  email: "",
  consent: true,
  honeypot: "",
  scrapCondition: "",
  scrapAskingPriceAed: "",
  proof: null,
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.1" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, PUBLIC_LEAD_VERIFICATION_MODE: "unverified", WHATSAPP_TEST_MODE: "false" };
  mocks.rows.clear();
  mocks.blocked = false;
  mocks.openStatus = null;
  mocks.insertError = false;
  mocks.notifyEmail = "";
  mocks.inserted.length = 0;
  mocks.converted.length = 0;
  mocks.events.length = 0;
  mocks.isRateLimited.mockReset().mockReturnValue(false);
  mocks.sendNewLeadNotification.mockReset();
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

describe("temporary public no-OTP submissions", () => {
  it.each(["valuation", "scrap"] as const)("persists one unverified %s lead, converts its partial, and retries safely", async (inquiryType) => {
    mocks.notifyEmail = "owner@example.test";
    const body = {
      ...base,
      inquiryType,
      ...(inquiryType === "scrap" ? { scrapCondition: "Damaged", scrapAskingPriceAed: "500" } : {}),
    };
    const first = await POST(request(body));
    expect(first.status).toBe(200);
    expect((await first.json()).data.id).toBe(base.submissionId);
    expect(mocks.inserted).toHaveLength(1);
    expect(mocks.inserted[0]).toMatchObject({ id: base.submissionId, phone_verified: false, inquiry_type: inquiryType });
    expect(mocks.converted).toHaveLength(1);
    expect(mocks.events).toHaveLength(1);
    expect(mocks.sendNewLeadNotification).toHaveBeenCalledTimes(1);
    const retry = await POST(request(body));
    expect(retry.status).toBe(200);
    expect(mocks.inserted).toHaveLength(1);
    expect(mocks.converted).toHaveLength(1);
    expect(mocks.events).toHaveLength(1);
    expect(mocks.sendNewLeadNotification).toHaveBeenCalledTimes(1);
  });

  it("never reports success if the database insert failed", async () => {
    mocks.insertError = true;
    const response = await POST(request(base));
    expect(response.status).toBe(500);
    expect((await response.json()).ok).toBe(false);
    expect(mocks.converted).toHaveLength(0);
  });

  it.each(["blocked", "open", "honeypot", "proof", "rate"] as const)("rejects %s attempts before insert", async (reason) => {
    if (reason === "blocked") mocks.blocked = true;
    if (reason === "open") mocks.openStatus = "new";
    if (reason === "rate") mocks.isRateLimited.mockReturnValue(true);
    const body = { ...base, ...(reason === "honeypot" ? { honeypot: "bot" } : {}), ...(reason === "proof" ? { proof: "forged" } : {}) };
    const response = await POST(request(body));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("requires OTP proof again when the server mode returns to otp", async () => {
    process.env.PUBLIC_LEAD_VERIFICATION_MODE = "otp";
    const response = await POST(request(base));
    expect(response.status).toBe(401);
    expect(mocks.inserted).toHaveLength(0);
  });
});
