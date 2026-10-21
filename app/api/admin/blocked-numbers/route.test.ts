import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";

const mocks = vi.hoisted(() => ({
  staffRole: "call_center" as string,
  upserted: [] as Record<string, unknown>[],
  deleted: [] as string[],
}));

vi.mock("@/lib/server/require-staff", () => ({
  requireStaff: async () => ({
    ok: true,
    identity: {
      userId: "user-cs-1",
      displayName: "CS Agent",
      role: mocks.staffRole,
      capabilities:
        mocks.staffRole === "call_center"
          ? ["viewLeadContact", "viewBlockedNumbers", "manageBlocklist"]
          : mocks.staffRole === "admin"
            ? ["manageBlocklist", "viewBlockedNumbers"]
            : ["viewPrices"],
    },
  }),
}));

vi.mock("@/lib/server/require-admin", () => ({
  requireAdmin: async () => {
    if (mocks.staffRole === "admin") {
      return {
        ok: true,
        identity: { userId: "user-admin-1", role: "admin", displayName: "Sir Nash", capabilities: ["manageBlocklist"] },
      };
    }
    return { ok: false, status: 403, message: "Forbidden" };
  },
}));

vi.mock("@/lib/admin/preview-guard", () => ({
  blockedByPreview: () => null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => ({
    from() {
      return {
        upsert: async (row: Record<string, unknown>) => {
          mocks.upserted.push(row);
          return { error: null };
        },
        delete: () => ({
          eq: async (field: string, val: string) => {
            mocks.deleted.push(val);
            return { error: null };
          },
        }),
      };
    },
  }),
}));

vi.mock("@/lib/admin/queries", () => ({
  fetchBlockedNumbers: async () => ({
    ok: true,
    data: { blocked: [], recentSuspicious: [], otpLimits: { rows: [], caps: {} } },
  }),
}));

describe("POST /api/admin/blocked-numbers (Blocking System)", () => {
  beforeEach(() => {
    mocks.staffRole = "call_center";
    mocks.upserted = [];
    mocks.deleted = [];
  });

  it("allows Customer Service (call_center) to block a phone number", async () => {
    mocks.staffRole = "call_center";
    const req = new NextRequest("http://localhost/api/admin/blocked-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+971501234567",
        reason: "manual_spam",
        fullName: "Spam Caller",
        note: "Repeated spam inquiries",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.phone_e164).toBe("+971501234567");
    expect(mocks.upserted.length).toBe(1);
    expect(mocks.upserted[0].phone_e164).toBe("+971501234567");
    expect(mocks.upserted[0].reason).toBe("manual_spam");
  });

  it("allows Super Admin to block a phone number", async () => {
    mocks.staffRole = "admin";
    const req = new NextRequest("http://localhost/api/admin/blocked-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+971509998877",
        reason: "manual_spam",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.upserted.length).toBe(1);
    expect(mocks.upserted[0].phone_e164).toBe("+971509998877");
  });

  it("rejects roles without manageBlocklist capability (e.g. purchaser)", async () => {
    mocks.staffRole = "purchaser";
    const req = new NextRequest("http://localhost/api/admin/blocked-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+971501234567",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.message).toContain("Not authorized");
    expect(mocks.upserted.length).toBe(0);
  });

  it("allows Customer Service to unblock a number", async () => {
    mocks.staffRole = "call_center";
    const req = new NextRequest("http://localhost/api/admin/blocked-numbers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+971501234567",
      }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.deleted).toContain("+971501234567");
  });
});
