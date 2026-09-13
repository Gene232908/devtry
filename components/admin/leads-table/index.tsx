"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Copy,
  FileQuestion,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLeads } from "@/lib/admin/leads-store";
import { useLeadsFilter } from "@/lib/admin/use-leads-filter";
import { useStaffIdentity } from "@/lib/admin/staff-identity-context";
import { exportLeadsCsv } from "@/lib/admin/export-csv";
import { cn } from "@/lib/utils";
import { LeadsToolbar } from "./toolbar";
import { LeadRow } from "./row";
import { LeadsTableSkeleton } from "./skeleton";
import { Pagination } from "./pagination";

const ATTENTION_CONFIG: Record<
  string,
  {
    title: string;
    description: string;
    badge: string;
    tone: "danger" | "warning";
    icon: typeof AlertTriangle;
  }
> = {
  "first-contact": {
    title: "Still Waiting for First Contact",
    description: "New or pending leads waiting more than 24 hours without contact from staff.",
    badge: "Urgent Attention",
    tone: "danger",
    icon: Clock3,
  },
  stalled: {
    title: "Leads Needing a Follow-up",
    description: "Already-contacted open leads with no activity or contact update for 3+ days.",
    badge: "Follow-up Required",
    tone: "warning",
    icon: AlertTriangle,
  },
  "missing-car": {
    title: "Leads Missing Car Details",
    description: "Leads submitted without complete make, model, or year details.",
    badge: "Record Check",
    tone: "warning",
    icon: FileQuestion,
  },
  duplicate: {
    title: "Duplicate Leads",
    description: "The flagged repeat submission and its earlier matching submission are shown together.",
    badge: "Data Quality",
    tone: "warning",
    icon: Copy,
  },
};

const PIPELINE_CONFIG: Record<string, { title: string; description: string }> = {
  new: { title: "New Leads", description: "Leads currently waiting at the New stage." },
  contacted: { title: "Contacted Leads", description: "Leads currently marked as Contacted." },
  inspection_scheduled: { title: "Inspection Scheduled", description: "Leads with an inspection currently booked." },
  negotiating: { title: "Leads Under Negotiation", description: "Leads currently in price or terms discussion." },
  deal: { title: "Deals", description: "Leads currently marked as Deal." },
};

export function LeadsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attention = searchParams.get("attention");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const activeAttention = attention ? ATTENTION_CONFIG[attention] : null;
  const activePipeline = status ? PIPELINE_CONFIG[status] : null;

  const { leads, isLive, isLoading, isRefreshing, refresh } = useLeads();
  const identity = useStaffIdentity();
  const filter = useLeadsFilter(leads, identity?.role, attention, status, from, to);

  if (isLoading) {
    return (
      <Card className="p-5">
        <LeadsTableSkeleton />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      {/* Active Attention Focus Banner - Displays ONLY when redirected from dashboard alerts */}
      {activeAttention && (
        <div
          className={cn(
            "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 backdrop-blur-md transition-all",
            activeAttention.tone === "danger"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                activeAttention.tone === "danger"
                  ? "border-red-500/40 bg-red-500/20 text-red-400"
                  : "border-amber-500/40 bg-amber-500/20 text-amber-400"
              )}
            >
              <activeAttention.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    activeAttention.tone === "danger" ? "text-red-400" : "text-amber-400"
                  )}
                >
                  {activeAttention.badge}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                  {filter.totalCount} {filter.totalCount === 1 ? "lead" : "leads"} found
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                {activeAttention.title}
              </p>
              <p className="text-xs text-gray-300">
                {activeAttention.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.replace("/admin/leads")}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/20 hover:border-white/30"
          >
            <X className="h-3.5 w-3.5" />
            Clear attention filter & view all leads
          </button>
        </div>
      )}

      {activePipeline && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sky-200 backdrop-blur-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/20 text-sky-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Pipeline stage</span>
              <p className="mt-0.5 text-sm font-semibold text-white">{activePipeline.title}</p>
              <p className="text-xs text-gray-300">
                {activePipeline.description}{from && to ? ` Showing ${from} to ${to}.` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.replace("/admin/leads")}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:border-white/30 hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
            Clear stage filter
          </button>
        </div>
      )}

      <LeadsToolbar
        search={filter.search}
        onSearch={filter.setSearch}
        statuses={filter.statuses}
        onStatuses={filter.setStatuses}
        makes={filter.makes}
        onMakes={filter.setMakes}
        emirates={filter.emirates}
        onEmirates={filter.setEmirates}
        arrivalStatuses={filter.arrivalStatuses}
        onArrivalStatuses={filter.setArrivalStatuses}
        hasFilters={filter.hasFilters}
        onClearFilters={() => {
          if (attention || status) {
            router.replace("/admin/leads");
          }
          filter.clearFilters();
        }}
        onExport={() => exportLeadsCsv(filter.allFiltered)}
        count={filter.totalCount}
        isLive={isLive}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        role={identity?.role}
      />

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-fluid--1">
          <thead>
            <tr className="border-b border-border text-text-faint">
              <th className="py-2 pr-4 font-normal">Client Name</th>
              <th className="py-2 pr-4 font-normal">Car Details</th>
              <th className="py-2 pr-4 font-normal">Mileage</th>
              <th className="py-2 pr-4 font-normal">Emirate</th>
              <th className="py-2 pr-4 font-normal">
                <button className="flex items-center gap-1" onClick={() => filter.toggleSort("date")}>
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2 pr-4 font-normal">
                <button className="flex items-center gap-1" onClick={() => filter.toggleSort("value")}>
                  Est. Value <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2 pr-4 font-normal">Status</th>
              <th className="py-2 pr-4 font-normal">Arrival Status</th>
            </tr>
          </thead>
          <tbody>
            {filter.pageItems.map((lead) => (
              <LeadRow key={lead.id} lead={lead} duplicateReview={attention === "duplicate"} showArrivalStatus={true} />
            ))}
          </tbody>
        </table>

        {filter.pageItems.length === 0 && (
          <p className="py-10 text-center text-fluid--1 text-text-faint">
            {activeAttention
              ? `No leads currently match '${activeAttention.title}'. Great job!`
              : "No leads match your filters."}
          </p>
        )}
      </div>

      <Pagination
        page={filter.page}
        totalPages={filter.totalPages}
        pageSize={filter.pageSize}
        totalCount={filter.totalCount}
        onPageChange={filter.setPage}
      />
    </Card>
  );
}
