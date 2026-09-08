"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Car, Download, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatAed, formatDate, formatPhoneDisplay } from "@/lib/format";
import type { Lead } from "@/config/mock-data";

interface RecentTransactionsTableProps {
  leads: Lead[];
  isLoading?: boolean;
}

export function RecentTransactionsTable({ leads, isLoading = false }: RecentTransactionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter leads based on search text and status
  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const query = search.trim().toLowerCase();
      if (!query) return matchesStatus;

      const matchesQuery =
        lead.fullName?.toLowerCase().includes(query) ||
        lead.make?.toLowerCase().includes(query) ||
        lead.model?.toLowerCase().includes(query) ||
        lead.id?.toLowerCase().includes(query) ||
        lead.phoneE164?.includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [leads, search, statusFilter]);

  const displayedRows = filtered.slice(0, 6);

  // Toggle selection
  function toggleSelectAll() {
    if (selectedIds.size === displayedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedRows.map((r) => r.id)));
    }
  }

  function toggleRow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  // Export CSV
  function exportCsv() {
    const rowsToExport = selectedIds.size > 0
      ? leads.filter((l) => selectedIds.has(l.id))
      : filtered;

    const headers = ["Lead ID", "Customer Name", "Phone", "Car Make", "Car Model", "Year", "Status", "Estimated Value AED", "Date"];
    const csvContent = [
      headers.join(","),
      ...rowsToExport.map((l) =>
        [
          l.id,
          `"${l.fullName || ""}"`,
          `"${l.phoneE164 || ""}"`,
          `"${l.make || ""}"`,
          `"${l.model || ""}"`,
          l.year || "",
          l.status || "",
          l.estimatedValueAed || "",
          `"${formatDate(l.createdAt)}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `carvibe-leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="flex flex-col justify-between border-border bg-[#111113] p-5 shadow-xl">
      {/* Table Header Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Car className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-text">Recent Leads & Valuation Flow</h3>
            <p className="text-xs text-text-faint">{filtered.length} active records in view</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
            <Input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-surface-2/80 border-border"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-text focus:border-gold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="inspection_scheduled">Inspection Scheduled</option>
              <option value="inspected">Inspected</option>
              <option value="negotiating">Negotiating</option>
              <option value="deal">Deal</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="h-8 gap-1.5 border-border bg-surface-2 text-xs text-text hover:border-gold hover:text-gold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Table Area */}
      {isLoading ? (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/50 pb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : displayedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-text">No leads found</p>
          <p className="mt-1 text-xs text-text-faint">Try adjusting your date range, search query, or status filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/70 text-text-faint">
                <th className="py-2.5 pr-2 w-8">
                  <input
                    type="checkbox"
                    checked={displayedRows.length > 0 && selectedIds.size === displayedRows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-700 bg-surface-2 text-gold focus:ring-gold"
                  />
                </th>
                <th className="py-2.5 pr-3 font-medium">Order / Ref</th>
                <th className="py-2.5 pr-4 font-medium">Vehicle Details</th>
                <th className="py-2.5 pr-4 font-medium">Date & Time</th>
                <th className="py-2.5 pr-4 font-medium">Customer</th>
                <th className="py-2.5 pr-4 font-medium">Est. Price</th>
                <th className="py-2.5 pr-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayedRows.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const initials = lead.fullName
                  ? lead.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "CV";

                return (
                  <tr
                    key={lead.id}
                    className={`group transition-colors hover:bg-surface-2/60 ${
                      isSelected ? "bg-gold/5" : ""
                    }`}
                  >
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => toggleRow(lead.id, e)}
                        className="rounded border-zinc-700 bg-surface-2 text-gold focus:ring-gold"
                      />
                    </td>

                    <td className="py-3 pr-3 font-mono text-[11px] text-text-muted">
                      <Link href={`/admin/leads/${lead.id}`} className="hover:text-gold hover:underline">
                        {lead.id.startsWith("L-") ? lead.id : `CV-${lead.id.slice(0, 6)}`}
                      </Link>
                    </td>

                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-gold">
                          <Car className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="font-medium text-text group-hover:text-gold"
                          >
                            {lead.make} {lead.model}
                          </Link>
                          <div className="text-[10px] text-text-faint">
                            {lead.year} • {lead.trim || "Standard"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-4 text-text-muted whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>

                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold">
                          {initials}
                        </div>
                        <div className="truncate max-w-[130px]">
                          <div className="truncate font-medium text-text">{lead.fullName || "Unnamed Client"}</div>
                          <div className="text-[10px] text-text-faint">{formatPhoneDisplay(lead.phoneE164)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-4 font-semibold text-text whitespace-nowrap">
                      {formatAed(lead.estimatedValueAed || 145000)}
                    </td>

                    <td className="py-3 pr-2">
                      <StatusPill status={lead.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Navigation Link */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
        <span className="text-text-faint">Showing up to 6 recent records</span>
        <Link href="/admin/leads" className="font-medium text-gold hover:underline">
          View all leads &rarr;
        </Link>
      </div>
    </Card>
  );
}
