"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  CircleDashed,
  Handshake,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { ResetCountdown } from "@/components/admin/ResetCountdown";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { OverviewDateFilter, type DateFilterValue } from "@/components/admin/OverviewDateFilter";
import { SalesOverviewChart } from "@/components/admin/SalesOverviewChart";
import { SalesPerformanceGauge } from "@/components/admin/SalesPerformanceGauge";
import { RecentTransactionsTable } from "@/components/admin/RecentTransactionsTable";
import { TopMarketsWidget } from "@/components/admin/TopMarketsWidget";
import { TopMakesWidget } from "@/components/admin/TopMakesWidget";
import { useLeads } from "@/lib/admin/leads-store";
import { useAdminStats, type AdminStatsSeed } from "@/lib/admin/use-admin-stats";
import { useFreshServerData } from "@/lib/admin/use-fresh-server-data";
import { formatNumber, LEAD_PIPELINE, STATUS_LABEL } from "@/lib/format";
import { endOfUaeDayUtc, uaeDayStringToUtc } from "@/lib/uae-time";

const PIPELINE_ICON = {
  new: Sparkles,
  pending: CircleDashed,
  contacted: PhoneCall,
  inspection_scheduled: CalendarClock,
  inspected: Search,
  negotiating: Handshake,
  deal: BadgeCheck,
  closed: XCircle,
} as const;

export default function AdminDashboardClient({ seed }: { seed?: AdminStatsSeed }) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "week",
    label: "This Week",
  });

  const activeStatsFilter = useMemo(() => {
    if (dateFilter.from && dateFilter.to) {
      return { from: dateFilter.from, to: dateFilter.to };
    }
    return undefined;
  }, [dateFilter.from, dateFilter.to]);

  const { leads, isLoading: leadsLoading, refresh: refreshLeads } = useLeads();
  const { stats, visitors, submissions, isLoading: statsLoading } = useAdminStats(seed, activeStatsFilter);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Filter recent leads if an explicit date range is chosen
  const filteredLeads = useMemo(() => {
    if (!dateFilter.from || !dateFilter.to) return leads;
    const fromMs = uaeDayStringToUtc(dateFilter.from).getTime();
    const toMs = endOfUaeDayUtc(dateFilter.to).getTime();
    return leads.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    });
  }, [leads, dateFilter.from, dateFilter.to]);

  const totalDealVolumeAed = useMemo(() => {
    const source = filteredLeads && filteredLeads.length > 0 ? filteredLeads : leads;
    return source.reduce((sum, l) => sum + (l.estimatedValueAed || 135000), 0);
  }, [filteredLeads, leads]);

  const dealCount = useMemo(() => {
    return stats.byStatus?.["deal"] ?? filteredLeads.filter((l) => l.status === "deal").length;
  }, [stats.byStatus, filteredLeads]);

  async function refreshAll() {
    setRefreshing(true);
    try {
      router.refresh();
      await refreshLeads();
    } finally {
      setRefreshing(false);
    }
  }

  useFreshServerData();

  const isTodayActive = dateFilter.preset === "today";
  const isWeekActive = dateFilter.preset === "week";
  const isBacklogActive = !isWeekActive;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-fluid-3 text-text">Sales Overview</h1>
          <p className="text-xs text-text-faint">Executive performance, valuation pipeline, and real-time deal metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshAll()} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {/* Historical Backlog & Time-Machine Filter Bar */}
      <OverviewDateFilter
        value={dateFilter}
        onChange={setDateFilter}
        isLoading={statsLoading}
      />

      {/* Compact Executive Pipeline Status Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {LEAD_PIPELINE.map((status) => {
          const Icon = PIPELINE_ICON[status];
          const count = stats.byStatus?.[status] ?? 0;
          const isDeal = status === "deal";

          return (
            <div
              key={status}
              className={`flex flex-col justify-between rounded-xl border p-3 transition-all ${
                isDeal
                  ? "border-gold/50 bg-gradient-to-br from-gold/15 to-surface-2 shadow-sm shadow-gold/5"
                  : "border-border/70 bg-surface-1/70 hover:border-border hover:bg-surface-2/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-[11px] font-medium text-text-muted">{STATUS_LABEL[status]}</span>
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isDeal ? "text-gold" : "text-text-faint"}`} />
              </div>
              <div className={`mt-2 text-xl font-bold ${isDeal ? "text-gold" : "text-text"}`}>
                {statsLoading ? "—" : formatNumber(count)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Engagement & Visitor counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Message Us clicks"
          value={formatNumber(stats.whatsappClicks)}
          hint={
            isBacklogActive
              ? `Times visitors clicked Message Us during ${dateFilter.label}.`
              : "Times a visitor pressed the Message Us button on the landing page."
          }
          icon={MessageCircle}
          isLoading={statsLoading}
        />
        <StatCard
          label="Call Now clicks"
          value={formatNumber(stats.callClicks ?? 0)}
          hint={
            isBacklogActive
              ? `Times visitors clicked Call Now during ${dateFilter.label}.`
              : "Times a visitor pressed the Call Now button on the landing page."
          }
          icon={PhoneCall}
          isLoading={statsLoading}
        />
        <StatCard
          label="Incomplete forms"
          value={formatNumber(stats.incompleteForms)}
          hint={
            isBacklogActive
              ? `Valuation forms started during ${dateFilter.label} but never submitted.`
              : "Someone entered their number and left before submitting. Their details are under Incomplete Forms."
          }
          icon={CircleDashed}
          isLoading={statsLoading}
        />
        <StatCard
          label={
            isTodayActive
              ? "Visitors today"
              : isWeekActive
                ? "Visitors today"
                : `Visitors (${dateFilter.preset === "all" ? "All Time" : "in period"})`
          }
          value={formatNumber(stats.visitorsToday)}
          hint={
            isTodayActive || isWeekActive
              ? "Distinct people who opened the site today. Refreshing or opening more pages does not count again."
              : `Distinct people who visited the site during ${dateFilter.label}.`
          }
          footer={isTodayActive || isWeekActive ? <ResetCountdown /> : undefined}
          icon={Users}
          isLoading={statsLoading}
        />
      </div>

      {/* Modern Bento Grid matching Reference Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Top Left: 2/3 width - Sales & Valuation Flow */}
        <div className="lg:col-span-8">
          <SalesOverviewChart
            submissions={submissions}
            visitors={visitors}
            isLoading={statsLoading}
            periodLabel={dateFilter.label}
            totalVolumeAed={totalDealVolumeAed}
          />
        </div>

        {/* Top Right: 1/3 width - Sales Performance Speedometer Gauge */}
        <div className="lg:col-span-4">
          <SalesPerformanceGauge
            dealCount={dealCount}
            totalLeads={stats.totalLeads}
            totalVolumeAed={totalDealVolumeAed}
            isLoading={statsLoading}
          />
        </div>

        {/* Bottom Left: 2/3 width - Recent Leads & Transactions Table */}
        <div className="lg:col-span-8">
          <RecentTransactionsTable leads={filteredLeads} isLoading={leadsLoading} />
        </div>

        {/* Bottom Right: 1/3 width - Top Markets & Top Vehicle Makes */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          <TopMarketsWidget leads={filteredLeads} isLoading={leadsLoading} />
          <TopMakesWidget leads={filteredLeads} isLoading={leadsLoading} />
        </div>
      </div>
    </div>
  );
}
