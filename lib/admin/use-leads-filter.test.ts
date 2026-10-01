import { describe, it, expect } from "vitest";
import { defaultStatusesForRole, filterStatusOptionsForRole, queuePriority } from "./use-leads-filter";

describe("defaultStatusesForRole", () => {
  it("does not hide converted incomplete forms from Customer Service or owners", () => {
    expect(defaultStatusesForRole("call_center")).toEqual([]);
    expect(defaultStatusesForRole("admin")).toEqual([]);
    expect(defaultStatusesForRole("manager")).toEqual([]);
  });

  it("keeps purchasers focused on newly scheduled inspections", () => {
    expect(defaultStatusesForRole("purchaser")).toEqual(["inspection_scheduled"]);
  });
});

describe("queuePriority", () => {
  it("puts an agent's New leads first and anything handed to a purchaser last", () => {
    const p = (status: Parameters<typeof queuePriority>[0]) => queuePriority(status, "call_center");
    expect(p("new")).toBeLessThan(p("pending"));
    expect(p("new")).toBeLessThan(p("contacted"));
    // Pending and Contacted are both "still mine to work" — same tier, broken
    // by date/value instead, not ranked against each other.
    expect(p("pending")).toBe(p("contacted"));
    expect(p("pending")).toBeLessThan(p("inspection_scheduled"));
    // Deal is not a status an agent can set (see canRoleSetStatus), but the
    // lead is still theirs and it is filterable (see AGENT_FILTER_STATUSES) —
    // it belongs in the same "handed off" tier as Inspection Scheduled, not
    // lumped in with the leads still actively theirs to work.
    expect(p("pending")).toBeLessThan(p("deal"));
    expect(p("inspection_scheduled")).toBe(p("deal"));
  });

  it("puts a purchaser's Inspection Scheduled leads first and Deal (sold) last", () => {
    const p = (status: Parameters<typeof queuePriority>[0]) => queuePriority(status, "purchaser");
    expect(p("inspection_scheduled")).toBeLessThan(p("inspected"));
    expect(p("inspection_scheduled")).toBeLessThan(p("negotiating"));
    // Inspected and Negotiating are both "still mine to work" — same tier.
    expect(p("inspected")).toBe(p("negotiating"));
    expect(p("negotiating")).toBeLessThan(p("deal"));
  });

  it("keeps the simple New-floats-to-top rule for owner roles and no role", () => {
    for (const role of ["admin", "manager", undefined] as const) {
      expect(queuePriority("new", role)).toBeLessThan(queuePriority("pending", role));
      // Nothing sinks to its own tier for an owner — "done" and "in progress"
      // rank the same, unlike the operational roles above.
      expect(queuePriority("inspection_scheduled", role)).toBe(queuePriority("pending", role));
      expect(queuePriority("deal", role)).toBe(queuePriority("negotiating", role));
    }
  });
});

describe("filterStatusOptionsForRole", () => {
  it("lets an agent filter down to Deal, even though they cannot set it themselves", () => {
    // The lead is still theirs after hand-off — canSeeLead never drops it —
    // so "which of my customers actually bought" has to be answerable here,
    // even though Deal is absent from what an agent's own status dropdown
    // offers (see canRoleSetStatus in lib/auth/lead-visibility.ts).
    expect(filterStatusOptionsForRole("call_center")).toContain("deal");
  });

  it("does not offer an agent statuses that could never be one of their leads", () => {
    const options = filterStatusOptionsForRole("call_center");
    expect(options).not.toContain("negotiating");
    expect(options).not.toContain("closed");
  });

  it("offers a purchaser the statuses a lead reaches them at, including No Show", () => {
    expect(filterStatusOptionsForRole("purchaser")).toEqual([
      "inspection_scheduled",
      "no_show",
      "inspected",
      "negotiating",
      "deal",
      "closed",
    ]);
  });

  it("offers an owner every status", () => {
    expect(filterStatusOptionsForRole("admin").length).toBeGreaterThan(
      filterStatusOptionsForRole("call_center").length,
    );
  });
});
