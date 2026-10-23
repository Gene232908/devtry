import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  staffRole: "call_center" as string,
  queried: 0,
}));

vi.mock("@/lib/server/require-admin", () => ({
  requireAdmin: async () => {
    if (mocks.staffRole === "admin" || mocks.staffRole === "manager") {
      return { ok: true, userId: "user-admin-1", identity: { userId: "user-admin-1", role: mocks.staffRole } };
    }
    if (mocks.staffRole === "anon") return { ok: false, status: 401, message: "Not authenticated." };
    return { ok: false, status: 403, message: "Admins only." };
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => {
    mocks.queried += 1;
    const result = {
      data: [
        {
          sold_at: "2026-08-10T10:00:00Z",
          purchase_price_aed: 50000,
          sale_price_aed: 60000,
          profit_aed: 10000,
          rate: 0.1,
          commission_aed: 1000,
          commission_statements: { period_month: "2026-08-01", status: "draft" },
          inventory: { make: "Nissan", model: "Patrol", trim: null, year: 2022 },
        },
      ],
      error: null,
    };
    const chain = {
      select: () => chain,
      gte: () => chain,
      lt: () => chain,
      order: async () => result,
    };
    return { from: () => chain };
  },
}));

function request(query = "quarter=2026-Q3&format=csv") {
  return new NextRequest(`http://localhost/api/admin/commission/statement?${query}`);
}

describe("GET /api/admin/commission/statement", () => {
  beforeEach(() => {
    mocks.queried = 0;
  });

  it.each(["call_center", "purchaser"])("refuses %s with 403 and never queries the database", async (role) => {
    mocks.staffRole = role;
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(mocks.queried).toBe(0);
  });

  it("refuses a signed-out caller with 401", async () => {
    mocks.staffRole = "anon";
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(mocks.queried).toBe(0);
  });

  it.each(["admin", "manager"])("still returns the statement to %s", async (role) => {
    mocks.staffRole = role;
    const res = await GET(request());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Nissan Patrol");
    expect(mocks.queried).toBe(1);
  });

  it("keeps validating the quarter for admins", async () => {
    mocks.staffRole = "admin";
    const res = await GET(request("quarter=bad"));
    expect(res.status).toBe(400);
  });
});
