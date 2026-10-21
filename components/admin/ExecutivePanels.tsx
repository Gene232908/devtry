"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  UsersRound,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ExecutiveOverview, OverviewRange } from "@/lib/admin/executive-overview";
import { cn } from "@/lib/utils";

export function OperationalAlerts({
  alerts,
  isLoading,
}: {
  alerts: ExecutiveOverview["alerts"];
  isLoading?: boolean;
}) {
  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-amber-500/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Needs attention</h3>
          <p className="mt-1 text-xs text-gray-400">Each follow-up lead is counted once.</p>
        </div>
        <AlertTriangle className="h-4 w-4 text-amber-400" />
      </div>
      {isLoading ? (
        <Skeleton className="h-52 w-full" />
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {alerts.map((alert) => (
            <Link
              href={alert.href}
              key={alert.key}
              className="flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded-xl first:pt-1 last:pb-1 group hover:bg-white/5 transition-all cursor-pointer"
            >
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-200 group-hover:text-amber-300 transition-colors">
                  {alert.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {alert.detail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums border transition-all",
                    alert.tone === "danger"
                      ? "bg-red-500/15 text-red-400 border-red-500/30 group-hover:bg-red-500/25"
                      : alert.tone === "warning"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30 group-hover:bg-amber-500/25"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 group-hover:bg-emerald-500/25"
                  )}
                >
                  {alert.count}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function FollowUpPanel({
  data,
  isLoading,
}: {
  data: ExecutiveOverview["pipelineSnapshot"];
  range?: OverviewRange;
  isLoading?: boolean;
}) {
  const stageHref = (status: string) => `/admin/leads?status=${status}`;
  const rows = [
    {
      label: "New leads",
      value: data?.newLeads ?? 0,
      icon: UsersRound,
      tone: "text-sky-400",
      href: stageHref("new"),
    },
    {
      label: "Contacted",
      value: data?.contacted ?? 0,
      icon: CheckCircle2,
      tone: "text-emerald-400",
      href: stageHref("contacted"),
    },
    {
      label: "Inspection scheduled",
      value: data?.inspectionScheduled ?? 0,
      icon: Clock3,
      tone: "text-purple-400",
      href: stageHref("inspection_scheduled"),
    },
    {
      label: "No Show",
      value: data?.noShow ?? 0,
      icon: CircleAlert,
      tone: "text-red-400",
      href: stageHref("no_show"),
    },
    {
      label: "Under negotiation",
      value: data?.underNegotiation ?? 0,
      icon: CircleAlert,
      tone: "text-amber-400",
      href: stageHref("negotiating"),
    },
    {
      label: "Deals",
      value: data?.deals ?? 0,
      icon: CheckCircle2,
      tone: "text-gold",
      href: stageHref("deal"),
    },
    {
      label: "Not Purchased",
      value: data?.notPurchased ?? 0,
      icon: XCircle,
      tone: "text-zinc-400",
      href: stageHref("closed"),
    },
  ];

  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-emerald-500/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Lead Pipeline</h3>
          <p className="mt-1 text-xs text-gray-400">Leads actioned and progressed in this period.</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      </div>
      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {rows.map(({ label, value, icon: Icon, tone, href }) => (
            <Link
              href={href}
              key={label}
              className="flex items-center justify-between py-3 px-2 -mx-2 rounded-xl first:pt-1 last:pb-1 group hover:bg-white/5 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-300 group-hover:text-amber-300 transition-colors">
                <Icon className={cn("h-4 w-4", tone)} />
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-sans font-semibold text-base sm:text-lg tabular-nums text-white group-hover:text-amber-300 transition-colors">
                  {value ?? 0}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DataQualityPanel({
  data,
  isLoading,
}: {
  data: ExecutiveOverview["dataQuality"];
  isLoading?: boolean;
}) {
  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-amber-500/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Record Check</h3>
          <p className="mt-1 text-xs text-gray-400">Checks leads and cars sold during the selected period.</p>
        </div>
        <span className="font-sans font-bold text-2xl text-amber-400 tabular-nums">{data.score}%</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {data.issues.map((issue) => (
            <Link
              href={issue.href}
              key={issue.label}
              className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl first:pt-1 last:pb-1 text-xs sm:text-sm group hover:bg-white/5 transition-all cursor-pointer"
            >
              <span className="text-gray-300 group-hover:text-amber-300 transition-colors">{issue.label}</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full border transition-all",
                    issue.count > 0
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/25 group-hover:bg-amber-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 group-hover:bg-emerald-500/20"
                  )}
                >
                  {issue.count}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function StaffSummaryTable({
  staff,
  isLoading,
}: {
  staff: ExecutiveOverview["staff"];
  isLoading?: boolean;
}) {
  const [roleFilter, setRoleFilter] = useState<"all" | "call_center" | "purchaser">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const agentCount = staff.filter((s) => s.role === "call_center").length;
  const purchaserCount = staff.filter((s) => s.role === "purchaser").length;

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return member.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [staff, roleFilter, searchQuery]);

  return (
    <Card className="overflow-hidden p-0 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Staff Results</h3>
          <p className="mt-1 text-xs text-gray-400">Profit and commission are based on the staff records already saved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {staff.length > 5 && (
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-36 sm:w-44 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none"
            />
          )}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-all",
                roleFilter === "all" ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              All ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("call_center")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-all",
                roleFilter === "call_center" ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Call Centre ({agentCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("purchaser")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-all",
                roleFilter === "purchaser" ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Purchasers ({purchaserCount})
            </button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] text-left text-xs sm:text-sm">
            <thead className="border-y border-white/10 bg-white/5 text-gray-400 font-medium">
              <tr>
                <th className="px-5 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 text-right font-medium">Assigned</th>
                <th className="px-4 py-3 text-right font-medium">Handled</th>
                <th className="px-4 py-3 text-right font-medium">Deals</th>
                <th className="px-4 py-3 text-right font-medium">Profit</th>
                <th className="px-5 py-3 text-right font-medium">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{member.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {member.role === "call_center" ? "Call Centre" : "Purchaser"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">{member.assigned}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">{member.handled}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">{member.deals}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                    AED {member.profit.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-amber-400 font-semibold">
                    AED {member.commission.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    {staff.length === 0
                      ? "No active Call Centre or Purchaser staff accounts."
                      : "No staff matching the selected filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
