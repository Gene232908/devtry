"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
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
import { RecentLeads } from "@/components/admin/RecentLeads";
import { useLeads } from "@/lib/admin/leads-store";
import { useAdminStats, type AdminStatsSeed } from "@/lib/admin/use-admin-stats";
import { useFreshServerData } from "@/lib/admin/use-fresh-server-data";
import { formatNumber, LEAD_PIPELINE, STATUS_HINT, STATUS_LABEL } from "@/lib/format";

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
 *
 * Recent Leads still comes from `useLeads()`. That provider is mounted once by
 * the admin layout and shared by every admin route, so it is fetched a single
 * time per session rather than per navigation — moving it here would not save
 * a round trip and would break the sharing.
 */
export default function AdminDashboardClient({ seed }: { seed?: AdminStatsSeed }) {
  const { leads, isLoading: leadsLoading, refresh: refreshLeads } = useLeads();
  const { stats, visitors, submissions, isLoading: statsLoading } = useAdminStats(seed);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  /**
   * The Overview reads its figures from the server render, which means it shows
   * whatever was true when this page was last rendered — and the App Router can
   * serve a cached payload on top of that. Sitting on the dashboard while new
   * visits arrive therefore showed a number that was quietly out of date, with
   * nothing on screen admitting it.
   *
   * `router.refresh()` drops that cache and re-runs the server render, so the
   * counts and both charts come back live. Recent Leads is refreshed alongside
   * it because it comes from the shared provider, not the server render, and a
   * half-updated dashboard is worse than a stale one.
   */
  async function refreshAll() {
    setRefreshing(true);
    try {
      router.refresh();
      await refreshLeads();
    } finally {
      setRefreshing(false);
    }
  }

  // Shared with every other server-rendered admin screen — see the hook for why
  // this is needed at all.
  useFreshServerData();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-fluid-3 text-text">Overview</h1>
        <Button variant="outline" size="sm" onClick={() => void refreshAll()} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {/* The pipeline, one card per stage.
          These were six unlabelled "Metric N" placeholders, left that way while
          it was still an open question which figures belonged here. It is no
          longer open: the owner wants to see where every lead stands, which is
          exactly the list the status dropdown offers.

          Every stage is shown even on zero. A stage that disappears when empty
          makes the pipeline look shorter than it is, and "nothing at Inspected"
          is itself worth noticing — it is the stage nobody is working. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {LEAD_PIPELINE.map((status) => (
          <StatCard
            key={status}
            label={STATUS_LABEL[status]}
            value={formatNumber(stats.byStatus?.[status] ?? 0)}
            hint={STATUS_HINT[status]}
            icon={PIPELINE_ICON[status]}
            // "Deal" is the only one given the accent: it is the outcome the
            // whole pipeline exists to reach.
            accent={status === "deal"}
            isLoading={statsLoading}
          />
        ))}
      </div>

      {/* Interest that has NOT become a lead yet.
          Kept apart from the pipeline above on purpose: a pipeline card counts
          people whose car you know about, and these count people who pressed a
          button. Mixing them into one row would invite adding them together,
          which would mean nothing. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Message Us clicks"
          value={formatNumber(stats.whatsappClicks)}
          hint="Times a visitor pressed the Message Us button on the landing page."
          icon={MessageCircle}
          isLoading={statsLoading}
        />
        <StatCard
          label="Call Now clicks"
          value={formatNumber(stats.callClicks ?? 0)}
          hint="Times a visitor pressed the Call Now button on the landing page."
          icon={PhoneCall}
          isLoading={statsLoading}
        />
        <StatCard
          label="Incomplete forms"
          value={formatNumber(stats.incompleteForms)}
          hint="Someone entered their number and left before submitting. Their details are under Incomplete Forms."
          icon={CircleDashed}
          isLoading={statsLoading}
        />
        <StatCard
          label="Visitors today"
          value={formatNumber(stats.visitorsToday)}
          hint="Distinct people who opened the site today. Refreshing or opening more pages does not count again."
          footer={<ResetCountdown />}
          icon={Users}
          isLoading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisitorsChart data={visitors} isLoading={statsLoading} />
        <SubmissionsChart data={submissions} isLoading={statsLoading} />
      </div>

      <RecentLeads leads={leads} isLoading={leadsLoading} />
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
        <span className="text-fluid--1 text-text-faint">This Week</span>
      </div>
      <div className="h-48">
        <Skeleton className="h-full w-full" />
      </div>
    </Card>
  );
}
