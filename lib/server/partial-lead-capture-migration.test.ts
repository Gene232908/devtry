import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0041_partial_lead_capture_sessions.sql"),
  "utf8",
);

describe("partial lead capture-session migration", () => {
  it("deduplicates a corrected phone by session and blocks stale revisions", () => {
    expect(migration).toContain("partial_leads_capture_session_idx");
    expect(migration).toContain("p_capture_revision < session_revision");
    expect(migration).toContain("set phone_e164 = p_phone");
    expect(migration).toContain("session_row_id is distinct from phone_row_id");
  });

  it("keeps the RPC service-role-only", () => {
    expect(migration).toMatch(/revoke all on function public\.capture_partial_lead[\s\S]*from public, anon, authenticated;/);
    expect(migration).toMatch(/grant execute on function public\.capture_partial_lead[\s\S]*to service_role;/);
  });
});

