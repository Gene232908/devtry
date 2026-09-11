"use client";

import dynamic from "next/dynamic";
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
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
// recharts is ~105 kB and is used by these two components and nowhere else in
// the app. Statically imported it made the Overview 223 kB of First Load JS
// against 102-116 kB for every other admin screen — the heaviest route by far,
// and therefore the slowest to compile in development and the slowest to become
// interactive in production.
//
// Loading them on demand keeps recharts out of the dashboard's critical path:
// the six stat cards and Recent Leads paint from the server render, and the
// charts arrive after. `ssr: false` because they measure their own container to
// size themselves and have nothing meaningful to render server-side, and the
// skeleton below reserves their height so nothing shifts when they land.
const VisitorsChart = dynamic(
  () => import("@/components/admin/VisitorsChart").then((m) => m.VisitorsChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Website Visitors" /> },
);

const SubmissionsChart = dynamic(
  () => import("@/components/admin/SubmissionsChart").then((m) => m.SubmissionsChart),
  { ssr: false, loading: () => <ChartPlaceholder title="Form Submissions" /> },
);
import { OverviewDateFilter, type DateFilterValue } from "@/components/admin/OverviewDateFilter";
import { RecentLeads } from "@/components/admin/RecentLeads";
import { useLeads } from "@/lib/admin/leads-store";
import { useAdminStats, type AdminStatsSeed } from "@/lib/admin/use-admin-stats";
import { useFreshServerData } from "@/lib/admin/use-fresh-server-data";
import { formatNumber, LEAD_PIPELINE, STATUS_HINT, STATUS_LABEL } from "@/lib/format";
import { endOfUaeDayUtc, uaeDayStringToUtc } from "@/lib/uae-time";

/**
 * One icon per pipeline stage.
 *
 * Shape carries the meaning alongside the label, so the row is scannable
 * without reading eight headings — and a colour-blind reader loses nothing,
 * since nothing here is distinguished by colour alone.
 */
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

/**
 * `seed` carries the counts and both chart series produced during the server
 * render in `page.tsx`, so the six cards and both charts paint with real
 * figures on the first frame instead of showing skeletons while the browser
 * makes two more HTTP calls.
 */
export default function AdminDashboardClient({ seed }: { seed?: AdminStatsSeed }) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "today",
    label: "Today",
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-fluid-3 text-text">Overview</h1>
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

      {/* The pipeline, one card per stage. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {LEAD_PIPELINE.map((status) => (
          <StatCard
            key={status}
            label={STATUS_LABEL[status]}
            value={formatNumber(stats.byStatus?.[status] ?? 0)}
            hint={
              isBacklogActive
                ? `Leads at '${STATUS_LABEL[status]}' for ${dateFilter.label}.`
                : STATUS_HINT[status]
            }
            icon={PIPELINE_ICON[status]}
            accent={status === "deal"}
            isLoading={statsLoading}
          />
        ))}
      </div>

      {/* Engagement & Visitor counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisitorsChart data={visitors} isLoading={statsLoading} periodLabel={dateFilter.label} />
        <SubmissionsChart data={submissions} isLoading={statsLoading} periodLabel={dateFilter.label} />
      </div>

      <RecentLeads leads={filteredLeads} isLoading={leadsLoading} />
    </div>
  );
}

/**
 * Stands in while a chart's code is still downloading.
 *
 * Deliberately the same shell the chart itself renders — same card, same
 * heading, same `h-48` plot area — so the charts do not push the page around
 * when they arrive. A placeholder of a different height would trade the old
 * slow first paint for layout shift, which is worse.
 */
function ChartPlaceholder({ title }: { title: string }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fluid-0 text-text">{title}</h3>
        <span className="text-fluid--1 text-text-faint">Today</span>
      </div>
      <div className="h-48">
        <Skeleton className="h-full w-full" />
      </div>
    </Card>
  );
}
