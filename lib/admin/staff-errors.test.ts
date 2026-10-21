import { describe, it, expect } from "vitest";
import {
  BASE_STAFF_ERRORS,
  calculateStaffErrorMetrics,
  filterStaffErrors,
  formatStaffErrorDate,
  generateStaffErrorsCsv,
} from "./staff-errors";

describe("Staff Errors & Reversals Audit Helper", () => {
  it("formats dates and strips trailing UAE", () => {
    const formatted = formatStaffErrorDate("2026-10-19T14:32:00.000Z");
    expect(formatted).not.toMatch(/UAE$/i);
    expect(formatted.length).toBeGreaterThan(5);
  });

  it("calculates staff error metrics and identifies agent mistake breakdown", () => {
    const metrics = calculateStaffErrorMetrics(BASE_STAFF_ERRORS);
    expect(metrics.totalErrors).toBe(4);
    expect(metrics.agentBreakdown.length).toBeGreaterThanOrEqual(2);

    // Maricel should be the highest with 3 mistakes
    const topAgent = metrics.agentBreakdown[0];
    expect(topAgent.agentName).toBe("Maricel");
    expect(topAgent.errorCount).toBe(3);

    // Ahmed should have 1 mistake
    const secondAgent = metrics.agentBreakdown[1];
    expect(secondAgent.agentName).toBe("Ahmed");
    expect(secondAgent.errorCount).toBe(1);
  });

  it("filters records by agent name", () => {
    const filtered = filterStaffErrors(BASE_STAFF_ERRORS, { agentName: "Ahmed" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].agentName).toBe("Ahmed");
  });

  it("filters records by query string across customer, car, and reason", () => {
    const filteredByCustomer = filterStaffErrors(BASE_STAFF_ERRORS, { query: "Nissan Patrol" });
    expect(filteredByCustomer.length).toBe(1);
    expect(filteredByCustomer[0].customerName).toBe("Ahmed Al-Mansoor");

    const filteredByReason = filterStaffErrors(BASE_STAFF_ERRORS, { query: "duplicate name" });
    expect(filteredByReason.length).toBe(1);
  });

  it("generates well-formatted CSV with headers and escaped contents", () => {
    const csv = generateStaffErrorsCsv(BASE_STAFF_ERRORS);
    expect(csv).toContain('"Date & Time","Staff Member","Role","Customer Name"');
    expect(csv).toContain('"Maricel"');
    expect(csv).toContain('"Ahmed Al-Mansoor"');
    expect(csv).not.toContain(" UAE,");
  });

  it("accurately attributes mistakes to the staff member rather than the approver", () => {
    const records = [
      {
        id: "rec-1",
        leadId: "lead-1",
        agentId: "agent-csr-1",
        agentName: "Agent1",
        agentRole: "call_center" as const,
        customerName: "Test Customer",
        vehicleDetails: "2024 Nissan Patrol",
        incidentType: "arrival_reversal" as const,
        incidentLabel: "Arrival Reversal",
        reason: "Customer did not arrive",
        timestamp: "2026-10-21T02:00:00.000Z",
        status: "reverted" as const,
        approvedBy: "Sir Nash (Super Admin)",
      },
      {
        id: "rec-2",
        leadId: "lead-2",
        agentId: "agent-csr-1",
        agentName: "Agent1",
        agentRole: "call_center" as const,
        customerName: "Another Customer",
        vehicleDetails: "2023 BMW X5",
        incidentType: "arrival_reversal" as const,
        incidentLabel: "Arrival Reversal Request",
        reason: "Premature check-in",
        timestamp: "2026-10-21T03:00:00.000Z",
        status: "pending_approval" as const,
        approvedBy: "Pending Sir Nash Approval",
      },
    ];

    const metrics = calculateStaffErrorMetrics(records);
    expect(metrics.totalErrors).toBe(2);
    expect(metrics.pendingReversals).toBe(1);

    // Errors should be attributed to Agent1, not Sir Nash
    expect(metrics.agentBreakdown[0].agentName).toBe("Agent1");
    expect(metrics.agentBreakdown[0].errorCount).toBe(2);

    // Filter by agent name
    const agentRecords = filterStaffErrors(records, { agentName: "Agent1" });
    expect(agentRecords.length).toBe(2);
    expect(agentRecords[0].approvedBy).toBe("Sir Nash (Super Admin)");
    expect(agentRecords[1].status).toBe("pending_approval");
  });
});
