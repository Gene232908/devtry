import type { StaffRole } from "@/lib/auth/permissions";
import { formatUaeDateTime } from "@/lib/uae-time";

export type IncidentType =
  | "arrival_reversal"
  | "duplicate_checkin"
  | "wrong_lead_selection"
  | "premature_arrival";

export type IncidentStatus = "reverted" | "pending_approval" | "rejected";

export interface StaffErrorRecord {
  id: string;
  leadId: string;
  agentId: string;
  agentName: string;
  agentRole: StaffRole;
  customerName: string;
  vehicleDetails: string;
  incidentType: IncidentType;
  incidentLabel: string;
  reason: string;
  timestamp: string; // ISO string
  status: IncidentStatus;
  approvedBy?: string;
}

export interface AgentErrorStat {
  agentId: string;
  agentName: string;
  agentRole: StaffRole;
  errorCount: number;
  thisMonthCount: number;
  lastErrorDate: string;
}

export interface StaffErrorSummary {
  totalErrors: number;
  errorsThisMonth: number;
  pendingReversals: number;
  mostCommonType: string;
  agentBreakdown: AgentErrorStat[];
}

/**
 * Standard realistic seed records for demonstration and executive audit report.
 * Merged with any live reversal submissions from local storage or server events.
 */
export const BASE_STAFF_ERRORS: StaffErrorRecord[] = [
  {
    id: "err-101",
    leadId: "lead-dxb-849",
    agentId: "demo-1",
    agentName: "Maricel",
    agentRole: "call_center",
    customerName: "Ahmed Al-Mansoor",
    vehicleDetails: "2021 Nissan Patrol Titanium",
    incidentType: "arrival_reversal",
    incidentLabel: "Arrival Reversal",
    reason: "Customer called back to reschedule for tomorrow; mistakenly marked arrived due to duplicate name in queue.",
    timestamp: "2026-10-19T14:32:00.000Z",
    status: "reverted",
    approvedBy: "Sir Nash (Super Admin)",
  },
  {
    id: "err-102",
    leadId: "lead-dxb-712",
    agentId: "demo-1",
    agentName: "Maricel",
    agentRole: "call_center",
    customerName: "Mohammed Tariq",
    vehicleDetails: "2020 Toyota Land Cruiser GXR",
    incidentType: "premature_arrival",
    incidentLabel: "Premature Check-In",
    reason: "Clicked arrival toggle while confirming phone appointment instead of after customer physical gate entry.",
    timestamp: "2026-10-18T10:15:00.000Z",
    status: "reverted",
    approvedBy: "Sir Nash (Super Admin)",
  },
  {
    id: "err-103",
    leadId: "lead-dxb-655",
    agentId: "demo-2",
    agentName: "Ahmed",
    agentRole: "purchaser",
    customerName: "Rashid Bin Butti",
    vehicleDetails: "2023 Mercedes-Benz G63 AMG",
    incidentType: "wrong_lead_selection",
    incidentLabel: "Wrong Lead Selection",
    reason: "Selected adjacent valuation record on iPad screen; inspection belonged to inquiry #656.",
    timestamp: "2026-10-15T16:45:00.000Z",
    status: "reverted",
    approvedBy: "Sir Nash (Super Admin)",
  },
  {
    id: "err-104",
    leadId: "lead-dxb-520",
    agentId: "demo-1",
    agentName: "Maricel",
    agentRole: "call_center",
    customerName: "Sultan Al-Nuaimi",
    vehicleDetails: "2022 Porsche Cayenne GTS",
    incidentType: "duplicate_checkin",
    incidentLabel: "Duplicate Check-In",
    reason: "Both CSR and front gate desk confirmed arrival simultaneously causing duplicate arrival event.",
    timestamp: "2026-09-28T11:20:00.000Z",
    status: "reverted",
    approvedBy: "Sir Nash (Super Admin)",
  },
];

/**
 * Clean date formatter stripping any trailing 'UAE' indicator.
 */
export function formatStaffErrorDate(isoString: string): string {
  return formatUaeDateTime(isoString).replace(/\s*UAE$/i, "").trim();
}

/**
 * Calculates high-level audit metrics and per-agent mistake frequency.
 */
export function calculateStaffErrorMetrics(records: StaffErrorRecord[]): StaffErrorSummary {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  let errorsThisMonth = 0;
  let pendingReversals = 0;
  const typeCounts: Record<string, number> = {};
  const agentMap: Record<string, AgentErrorStat> = {};

  for (const rec of records) {
    if (rec.status === "pending_approval") {
      pendingReversals++;
    }

    const recDate = new Date(rec.timestamp);
    const isThisMonth =
      !isNaN(recDate.getTime()) &&
      recDate.getUTCFullYear() === currentYear &&
      recDate.getUTCMonth() === currentMonth;

    if (isThisMonth) {
      errorsThisMonth++;
    }

    // Type count
    typeCounts[rec.incidentLabel] = (typeCounts[rec.incidentLabel] || 0) + 1;

    // Agent map
    if (!agentMap[rec.agentId]) {
      agentMap[rec.agentId] = {
        agentId: rec.agentId,
        agentName: rec.agentName,
        agentRole: rec.agentRole,
        errorCount: 0,
        thisMonthCount: 0,
        lastErrorDate: rec.timestamp,
      };
    }

    const stat = agentMap[rec.agentId];
    stat.errorCount++;
    if (isThisMonth) stat.thisMonthCount++;

    if (new Date(rec.timestamp).getTime() > new Date(stat.lastErrorDate).getTime()) {
      stat.lastErrorDate = rec.timestamp;
    }
  }

  // Find most common type
  let mostCommonType = "None";
  let maxTypeCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxTypeCount) {
      maxTypeCount = count;
      mostCommonType = type;
    }
  }

  // Sort agents by mistake count descending
  const agentBreakdown = Object.values(agentMap).sort((a, b) => b.errorCount - a.errorCount);

  return {
    totalErrors: records.length,
    errorsThisMonth,
    pendingReversals,
    mostCommonType,
    agentBreakdown,
  };
}

/**
 * Filter records by search query, period, and agent.
 */
export function filterStaffErrors(
  records: StaffErrorRecord[],
  options: {
    query?: string;
    period?: "all" | "this_month" | "last_30_days";
    agentName?: string;
    status?: "all" | "pending" | "completed";
  }
): StaffErrorRecord[] {
  const query = (options.query ?? "").trim().toLowerCase();
  const period = options.period ?? "all";
  const selectedAgent = (options.agentName ?? "all").trim().toLowerCase();
  const statusFilter = options.status ?? "all";

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return records.filter((rec) => {
    // Status filter (pending vs completed vs all)
    if (statusFilter === "pending") {
      if (rec.status !== "pending_approval") return false;
    } else if (statusFilter === "completed") {
      if (rec.status !== "reverted" && rec.status !== "rejected") return false;
    }

    // Agent filter
    if (selectedAgent !== "all" && rec.agentName.toLowerCase() !== selectedAgent) {
      return false;
    }

    // Period filter
    if (period !== "all") {
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) return false;
      if (period === "this_month") {
        if (d.getUTCFullYear() !== currentYear || d.getUTCMonth() !== currentMonth) {
          return false;
        }
      } else if (period === "last_30_days") {
        if (d.getTime() < thirtyDaysAgo.getTime()) {
          return false;
        }
      }
    }

    // Text search query
    if (query) {
      const matchAgent = rec.agentName.toLowerCase().includes(query);
      const matchCustomer = rec.customerName.toLowerCase().includes(query);
      const matchVehicle = rec.vehicleDetails.toLowerCase().includes(query);
      const matchReason = rec.reason.toLowerCase().includes(query);
      const matchType = rec.incidentLabel.toLowerCase().includes(query);
      const matchLead = rec.leadId.toLowerCase().includes(query);

      if (!matchAgent && !matchCustomer && !matchVehicle && !matchReason && !matchType && !matchLead) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Generates an executive CSV export string of staff error records.
 */
export function generateStaffErrorsCsv(records: StaffErrorRecord[]): string {
  const headers = [
    "Date & Time",
    "Staff Member",
    "Role",
    "Customer Name",
    "Vehicle",
    "Lead Reference",
    "Incident Type",
    "Stated Reason",
    "Status",
    "Action Taken By",
  ];

  const rows = records.map((r) => [
    formatStaffErrorDate(r.timestamp),
    r.agentName,
    r.agentRole,
    r.customerName,
    r.vehicleDetails,
    r.leadId,
    r.incidentLabel,
    r.reason,
    r.status === "reverted" ? "Reverted" : r.status === "pending_approval" ? "Pending Approval" : "Rejected",
    r.approvedBy || "Sir Nash",
  ]);

  const escapeCell = (val: string) => {
    const clean = String(val ?? "").replace(/"/g, '""');
    return `"${clean}"`;
  };

  const csvLines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  return csvLines.join("\r\n");
}
