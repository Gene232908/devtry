"use client";

import { useState } from "react";
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
import { exportExcel, exportLeadsPdf, leadExportRows } from "@/lib/admin/export-reports";
import { cn } from "@/lib/utils";
import { LeadsToolbar } from "./toolbar";
import { LeadRow } from "./row";
import { LeadsTableSkeleton } from "./skeleton";
import { Pagination } from "./pagination";
import { MobileLeadsList } from "./mobile-list";
import { ManualLeadDialog } from "@/components/admin/ManualLeadDialog";

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
  no_show: { title: "No Show Leads", description: "Customers who did not attend their scheduled inspection." },
  negotiating: { title: "Leads Under Negotiation", description: "Leads currently in price or terms discussion." },
  deal: { title: "Deals", description: "Leads currently marked as Deal." },
};

export function LeadsTable() {
  const [manualLeadOpen, setManualLeadOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const attention = searchParams.get("attention");
  const status = searchParams.get("status");
  const origin = searchParams.get("origin");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const activeAttention = attention ? ATTENTION_CONFIG[attention] : null;
  const activePipeline = status ? PIPELINE_CONFIG[status] : null;

  const { leads, isLive, isLoading, isRefreshing, refresh } = useLeads();
  const identity = useStaffIdentity();
  const isScrapView = origin === "scrap";
  const scopedLeads = isScrapView
    ? leads.filter((lead) => lead.inquiryType === "scrap")
    : leads.filter((lead) => lead.inquiryType !== "scrap");
  const filter = useLeadsFilter(scopedLeads, identity?.role, attention, status, from, to);

  if (isLoading) {
    return (
      <Card className="p-5">
        <LeadsTableSkeleton />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      {isScrapView && (
        <div className="mb-5 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <h2 className="text-base font-semibold text-text">Scrap Inquiries</h2>
          <p className="mt-1 text-sm text-text-muted">Scrap stays permanently classified as Scrap. Use the normal follow-up, optional inspection, Deal, and Closed workflow.</p>
        </div>
      )}
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
        onExportPdf={() => exportLeadsPdf(filter.allFiltered)}
        onExportExcel={() => exportExcel("CarVibeDubai Leads", leadExportRows(filter.allFiltered), "carvibedubai-leads.xls")}
        count={filter.totalCount}
        isLive={isLive}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onCreateLead={() => setManualLeadOpen(true)}
        role={identity?.role}
      />

      <ManualLeadDialog
        open={manualLeadOpen}
        onClose={() => setManualLeadOpen(false)}
        onCreated={refresh}
      />

      {/* Mobile to Medium Streamlined View (Client Name priority, no crowded 9-column horizontal overflow) */}
      <div className="mt-5 block lg:hidden">
        <MobileLeadsList
          leads={filter.pageItems}
          duplicateReview={attention === "duplicate"}
          emptyMessage={
            activeAttention
              ? `No leads currently match '${activeAttention.title}'. Great job!`
              : "No leads match your filters."
          }
        />
      </div>

      {/* Desktop / Laptop Full 9-Column Table */}
      <div className="mt-5 hidden lg:block overflow-x-auto rounded-xl border border-white/[0.08] bg-surface-1/40">
        <table className="w-full min-w-[1080px] text-left text-fluid--1">
          <thead>
            <tr className="border-b border-border/80 text-text-faint text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 pl-4 pr-3 min-w-[160px]">Client Name</th>
              <th className="py-3 pr-3 min-w-[180px]">Car Details</th>
              <th className="py-3 pr-3 min-w-[110px] whitespace-nowrap">Lead Source</th>
              <th className="py-3 pr-3 min-w-[105px] whitespace-nowrap">Mileage</th>
              <th className="py-3 pr-3 min-w-[100px] whitespace-nowrap">Emirate</th>
              <th className="py-3 pr-3 min-w-[125px] whitespace-nowrap">
                <button className="flex items-center gap-1 hover:text-text transition-colors" onClick={() => filter.toggleSort("date")}>
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3 pr-3 min-w-[110px] whitespace-nowrap">
                <button className="flex items-center gap-1 hover:text-text transition-colors" onClick={() => filter.toggleSort("value")}>
                  Est. Value <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3 pr-3 min-w-[115px] whitespace-nowrap">Status</th>
              <th className="py-3 pr-4 min-w-[130px] whitespace-nowrap">Arrival Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
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
