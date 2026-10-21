"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Search,
  ExternalLink,
  RotateCw,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import {
  calculateStaffErrorMetrics,
  filterStaffErrors,
  formatStaffErrorDate,
  type StaffErrorRecord,
} from "@/lib/admin/staff-errors";

const STAFF_PAGE_SIZE = 10;
const INCIDENT_PAGE_SIZE = 10;

export function StaffErrorReport() {
  const [records, setRecords] = useState<StaffErrorRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "this_month" | "last_30_days">("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "completed" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & search states for Staff Reversal Frequency List
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffPage, setStaffPage] = useState(1);

  // Pagination state for Incident Records Table
  const [incidentPage, setIncidentPage] = useState(1);

  // Load strictly accurate error records from live server API
  const loadAccurateData = useCallback(async () => {
    setIsLoading(true);
    let apiRecords: StaffErrorRecord[] = [];

    try {
      const res = await fetch("/api/admin/staff-errors", { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        if (body.ok && Array.isArray(body.data?.records)) {
          apiRecords = body.data.records;
        }
      }
    } catch {
      // API error fallback
    }

    setRecords(apiRecords);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAccurateData();
  }, [loadAccurateData]);

  // Compute metrics from real records
  const metrics = useMemo(() => calculateStaffErrorMetrics(records), [records]);

  // Extract unique agents for dropdown
  const uniqueAgents = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.agentName)));
    return names.sort();
  }, [records]);

  // Filtered records for incident audit table with status filter
  const filteredRecords = useMemo(() => {
    return filterStaffErrors(records, {
      query: searchQuery,
      period: selectedPeriod,
      agentName: selectedAgent,
      status: selectedStatus,
    });
  }, [records, searchQuery, selectedPeriod, selectedAgent, selectedStatus]);

  // Handle direct reversal approval or decline from Sir Nash
  async function handleResolveReversal(
    leadId: string,
    action: "approve" | "decline",
    reason?: string,
    recordId?: string
  ) {
    if (recordId) setActionLoading(recordId);
    try {
      const body =
        action === "approve"
          ? { arrival_status: "not_arrived", reason: reason || "Reversal approved by Sir Nash" }
          : { decline_arrival_reversal: true };

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadAccurateData();
      }
    } catch (err) {
      console.error("Failed to resolve arrival reversal:", err);
    } finally {
      setActionLoading(null);
    }
  }

  // Max count for visual frequency bar calculation
  const maxAgentErrors = useMemo(() => {
    if (metrics.agentBreakdown.length === 0) return 1;
    return Math.max(...metrics.agentBreakdown.map((a) => a.errorCount), 1);
  }, [metrics.agentBreakdown]);

  // Staff Frequency List: Filtered & Paginated (Max 10 per page)
  const filteredStaffBreakdown = useMemo(() => {
    let list = metrics.agentBreakdown;
    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.trim().toLowerCase();
      list = list.filter((s) => {
        const roleStr = (ROLE_LABELS[s.agentRole] ?? s.agentRole).toLowerCase();
        return s.agentName.toLowerCase().includes(q) || roleStr.includes(q);
      });
    }
    return list;
  }, [metrics.agentBreakdown, staffSearchQuery]);

  const totalStaff = filteredStaffBreakdown.length;
  const totalStaffPages = Math.max(1, Math.ceil(totalStaff / STAFF_PAGE_SIZE));
  const safeStaffPage = Math.min(staffPage, totalStaffPages);
  const paginatedStaff = useMemo(() => {
    const start = (safeStaffPage - 1) * STAFF_PAGE_SIZE;
    return filteredStaffBreakdown.slice(start, start + STAFF_PAGE_SIZE);
  }, [filteredStaffBreakdown, safeStaffPage]);

  // Incident Records Table: Paginated (Max 10 per page)
  const totalIncidents = filteredRecords.length;
  const totalIncidentPages = Math.max(1, Math.ceil(totalIncidents / INCIDENT_PAGE_SIZE));
  const safeIncidentPage = Math.min(incidentPage, totalIncidentPages);
  const paginatedIncidents = useMemo(() => {
    const start = (safeIncidentPage - 1) * INCIDENT_PAGE_SIZE;
    return filteredRecords.slice(start, start + INCIDENT_PAGE_SIZE);
  }, [filteredRecords, safeIncidentPage]);

  // Helper for responsive pagination controls
  function renderPagination(
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) {
    if (totalPages <= 1) return null;

    let pageNumbers: (number | string)[] = [];
    if (totalPages <= 7) {
      pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      if (currentPage <= 4) {
        pageNumbers = [1, 2, 3, 4, 5, "...", totalPages];
      } else if (currentPage >= totalPages - 3) {
        pageNumbers = [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pageNumbers = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
      }
    }

    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-text transition hover:border-gold disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pageNumbers.map((num, idx) => {
          if (num === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-text-muted text-xs select-none">
                ...
              </span>
            );
          }
          const pageNum = num as number;
          const isActive = currentPage === pageNum;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition",
                isActive
                  ? "bg-gold text-surface-dark shadow-sm"
                  : "border border-border bg-surface-2 text-text hover:border-gold"
              )}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-text transition hover:border-gold disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Top Executive Summary Cards (Simplified) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-surface/70 border-border/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span className="font-medium uppercase tracking-wider">Reversals This Month</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Oct 2026
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-text">{metrics.errorsThisMonth}</span>
            <span className="text-xs text-text-muted">reversal events</span>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Arrival turn-offs recorded this month</p>
        </Card>

        <Card className="p-4 bg-surface/70 border-border/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span className="font-medium uppercase tracking-wider">All-Time Recorded</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-text">{metrics.totalErrors}</span>
            <span className="text-xs text-text-muted">total incidents</span>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Real database audit footprint</p>
        </Card>

        <Card className="p-4 bg-surface/70 border-border/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span className="font-medium uppercase tracking-wider">Staff Involved</span>
            <Users className="w-4 h-4 text-gold" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-text">{metrics.agentBreakdown.length}</span>
            <span className="text-xs text-text-muted">staff members</span>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">With recorded reversal actions</p>
        </Card>
      </div>

      {/* ─── Per-Agent Frequency (Professional List View with Max 10 Pagination) ─── */}
      {metrics.agentBreakdown.length > 0 && (
        <Card className="overflow-hidden bg-surface/60 border border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border/50 bg-surface/30">
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                Staff Reversal Frequency
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Accurate count of arrival status reversions and turn-offs by staff member.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="relative min-w-[180px] max-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <Input
                  value={staffSearchQuery}
                  onChange={(e) => {
                    setStaffSearchQuery(e.target.value);
                    setStaffPage(1);
                  }}
                  placeholder="Search staff or role..."
                  className="h-8 pl-8 pr-7 text-xs bg-surface-2/60 border-border/60 text-text placeholder:text-text-muted"
                />
                {staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setStaffSearchQuery("");
                      setStaffPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono text-text-muted bg-surface-2/60 px-2.5 py-1.5 rounded-md border border-border/40 whitespace-nowrap">
                {totalStaff} staff member{totalStaff !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2/40 text-text-muted font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4 text-center">Total Reversals</th>
                  <th className="py-2.5 px-4 text-center">This Month</th>
                  <th className="py-2.5 px-4">Last Reversal</th>
                  <th className="py-2.5 px-4 min-w-[140px]">Relative Frequency</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-text-muted text-xs">
                      No staff members matching &ldquo;{staffSearchQuery}&rdquo;
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((stat, idx) => {
                    const percentage = Math.round((stat.errorCount / maxAgentErrors) * 100);
                    const isSelected = selectedAgent === stat.agentName;
                    const rank = (safeStaffPage - 1) * STAFF_PAGE_SIZE + idx + 1;

                    return (
                      <tr
                        key={stat.agentId}
                        className={cn(
                          "hover:bg-surface-2/30 transition-colors",
                          isSelected && "bg-gold/5"
                        )}
                      >
                        <td className="py-3 px-4 text-center font-mono text-text-muted text-[11px]">
                          {rank}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-[11px] uppercase shrink-0">
                              {stat.agentName.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-text text-xs">{stat.agentName}</div>
                              <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
                                {ROLE_LABELS[stat.agentRole] ?? stat.agentRole}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold font-display text-xs">
                            {stat.errorCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-text-muted">
                          {stat.thisMonthCount}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-text-muted">
                          {formatStaffErrorDate(stat.lastErrorDate)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-surface-2 rounded-full overflow-hidden min-w-[60px]">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-gold rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(percentage, 10)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-text-muted font-mono w-8 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAgent("all");
                              } else {
                                setSelectedAgent(stat.agentName);
                              }
                              setIncidentPage(1);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded text-[11px] font-medium transition-colors border",
                              isSelected
                                ? "bg-gold text-surface-dark border-gold font-semibold shadow-sm"
                                : "bg-surface-2/60 text-text-muted border-border hover:border-gold hover:text-gold"
                            )}
                          >
                            {isSelected ? "Active Filter" : "Filter View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Staff Frequency Pagination Footer */}
          {totalStaffPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-border/60 bg-surface/40 text-xs">
              <span className="text-text-muted">
                Showing <span className="font-semibold text-text">{(safeStaffPage - 1) * STAFF_PAGE_SIZE + 1}</span> to{" "}
                <span className="font-semibold text-text">{Math.min(safeStaffPage * STAFF_PAGE_SIZE, totalStaff)}</span> of{" "}
                <span className="font-semibold text-text">{totalStaff}</span> staff members
              </span>
              {renderPagination(safeStaffPage, totalStaffPages, setStaffPage)}
            </div>
          )}
        </Card>
      )}

      {/* ─── Search & Filter Toolbar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/50 p-3 rounded-lg border border-border/60">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIncidentPage(1);
              }}
              placeholder="Search staff, customer, car, reason..."
              className="pl-9 h-9 text-xs bg-surface-2/50"
            />
          </div>

          {/* Status Filter (Default: Pending Review) */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as "pending" | "completed" | "all");
              setIncidentPage(1);
            }}
            aria-label="Filter by status"
            className="h-9 px-3 rounded-md bg-surface-2/60 border border-border/60 text-xs text-text focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
          >
            <option value="pending" className="bg-[#141416] text-text">Pending Review (Default)</option>
            <option value="completed" className="bg-[#141416] text-text">Completed / Reverted</option>
            <option value="all" className="bg-[#141416] text-text">All Statuses</option>
          </select>

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value as "all" | "this_month" | "last_30_days");
              setIncidentPage(1);
            }}
            aria-label="Filter by time period"
            className="h-9 px-3 rounded-md bg-surface-2/60 border border-border/60 text-xs text-text focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
          >
            <option value="all" className="bg-[#141416] text-text">All Time</option>
            <option value="this_month" className="bg-[#141416] text-text">This Month (Oct 2026)</option>
            <option value="last_30_days" className="bg-[#141416] text-text">Last 30 Days</option>
          </select>

          {/* Agent Filter */}
          {uniqueAgents.length > 0 && (
            <select
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setIncidentPage(1);
              }}
              aria-label="Filter by staff member"
              className="h-9 px-3 rounded-md bg-surface-2/60 border border-border/60 text-xs text-text focus:outline-none focus:ring-1 focus:ring-gold cursor-pointer"
            >
              <option value="all" className="bg-[#141416] text-text">All Staff Members</option>
              {uniqueAgents.map((name) => (
                <option key={name} value={name} className="bg-[#141416] text-text">
                  {name}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAccurateData()}
            disabled={isLoading}
            className="h-9 text-xs px-2.5"
            title="Reload live database records"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {(searchQuery || selectedPeriod !== "all" || selectedAgent !== "all" || selectedStatus !== "pending") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedPeriod("all");
                setSelectedAgent("all");
                setSelectedStatus("pending");
                setIncidentPage(1);
              }}
              className="h-9 text-xs px-2.5"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ─── Incident Records Table / List (Accurate with Pagination) ─── */}
      <Card className="overflow-hidden bg-surface/60 border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-2/40 text-text-muted font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Customer &amp; Vehicle</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4 min-w-[240px]">Stated Reason / Description</th>
                <th className="py-3 px-4">Status &amp; Resolution</th>
                <th className="py-3 px-4 text-right">Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted text-xs">
                    <RotateCw className="w-4 h-4 animate-spin inline-block mr-2 text-gold" />
                    Loading accurate audit records from database...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted text-xs">
                    <div className="max-w-md mx-auto space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="text-text font-medium">
                        {selectedStatus === "pending"
                          ? "No Pending Arrival Reversals"
                          : selectedStatus === "completed"
                          ? "No Completed Reversals Found"
                          : "No Reversals or Staff Errors Recorded"}
                      </div>
                      <p className="text-text-muted text-[11px]">
                        {selectedStatus === "pending"
                          ? "There are currently no arrival reversal requests awaiting Sir Nash review."
                          : selectedStatus === "completed"
                          ? "No completed or cleared arrival reversions match the selected filters."
                          : "All arrival check-ins and operational actions are currently accurate and in good standing."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedIncidents.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-2/20 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-text-muted">
                      {formatStaffErrorDate(rec.timestamp)}
                    </td>

                    {/* Agent */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-text">{rec.agentName}</div>
                      <span className="inline-block text-[10px] text-text-muted uppercase font-mono">
                        {ROLE_LABELS[rec.agentRole] ?? rec.agentRole}
                      </span>
                    </td>

                    {/* Customer & Car */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-text">{rec.customerName}</div>
                      <div className="text-[11px] text-text-muted line-clamp-1">{rec.vehicleDetails}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {rec.incidentLabel}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4">
                      <div className="p-2 rounded bg-surface-2/50 border border-border/40 text-[11px] text-text">
                        {rec.reason}
                      </div>
                    </td>

                    {/* Status & Resolution */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {rec.status === "pending_approval" ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                            Pending Sir Nash Review
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={actionLoading === rec.id}
                              onClick={() => handleResolveReversal(rec.leadId, "approve", rec.reason, rec.id)}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Approve request and turn off customer arrival"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === rec.id}
                              onClick={() => handleResolveReversal(rec.leadId, "decline", undefined, rec.id)}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-text-muted hover:text-white hover:bg-zinc-700 border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Decline request and keep customer marked as arrived"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Reverted &amp; Cleared
                          </span>
                          {rec.approvedBy && (
                            <div className="text-[9px] text-text-muted mt-0.5 font-mono">
                              By: {rec.approvedBy}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Link to Lead */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/leads/${rec.leadId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-gold bg-gold/10 hover:bg-gold/20 transition-colors"
                      >
                        <span>Lead</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Incident Records Pagination Footer */}
        {totalIncidentPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border/60 bg-surface/40 text-xs">
            <span className="text-text-muted">
              Showing <span className="font-semibold text-text">{(safeIncidentPage - 1) * INCIDENT_PAGE_SIZE + 1}</span> to{" "}
              <span className="font-semibold text-text">{Math.min(safeIncidentPage * INCIDENT_PAGE_SIZE, totalIncidents)}</span> of{" "}
              <span className="font-semibold text-text">{totalIncidents}</span> recorded incidents
            </span>
            {renderPagination(safeIncidentPage, totalIncidentPages, setIncidentPage)}
          </div>
        )}
      </Card>
    </div>
  );
}
