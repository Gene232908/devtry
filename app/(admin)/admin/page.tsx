"use client";

import { CircleDashed } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { VisitorsChart } from "@/components/admin/VisitorsChart";
import { SubmissionsChart } from "@/components/admin/SubmissionsChart";
import { RecentLeads } from "@/components/admin/RecentLeads";
import { useLeads } from "@/lib/admin/leads-store";
import { useAdminStats } from "@/lib/admin/use-admin-stats";
import { formatNumber } from "@/lib/format";

export default function AdminDashboardPage() {
  const { leads, isLoading: leadsLoading } = useLeads();
  const { stats, visitors, submissions, isLoading: statsLoading } = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Overview</h1>
      </div>

      {/* MILESTONE 2 BRANCH — the six cards are deliberately unlabelled.
          Which figures belong on the Overview depends entirely on what the
          owner checks each morning, and that has not been agreed yet. Naming
          them now would present a decision as already made and quietly close a
          conversation that is the whole point of this walkthrough.

          The layout is the part being reviewed: six slots, filling evenly at
          every breakpoint — three rows of two on tablet, two rows of three on
          desktop, no orphan card on a row of its own. The sample values are
          there so the card design reads properly at a glance. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          formatNumber(stats.totalLeads),
          formatNumber(stats.newToday),
          formatNumber(stats.activeLeads),
          formatNumber(stats.incompleteForms),
          formatNumber(stats.visitorsThisWeek),
          formatNumber(stats.whatsappClicks),
        ].map((value, index) => (
          <StatCard
            key={index}
            label={`Metric ${index + 1}`}
            value={value}
            sublabel="To be confirmed"
            icon={CircleDashed}
            // One accent card so the highlighted treatment is still visible in
            // the design being reviewed.
            accent={index === 0}
            isLoading={statsLoading}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisitorsChart data={visitors} isLoading={statsLoading} />
        <SubmissionsChart data={submissions} isLoading={statsLoading} />
      </div>

      <RecentLeads leads={leads} isLoading={leadsLoading} />
    </div>
  );
}
