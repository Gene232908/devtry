"use client";

import { Users, FileCheck2, Activity, Eye, Wallet, MessageCircle } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { VisitorsChart } from "@/components/admin/VisitorsChart";
import { SubmissionsChart } from "@/components/admin/SubmissionsChart";
import { RecentLeads } from "@/components/admin/RecentLeads";
import { useLeads } from "@/lib/admin/leads-store";
import { useAdminStats } from "@/lib/admin/use-admin-stats";
import { formatAed, formatNumber } from "@/lib/format";

export default function AdminDashboardPage() {
  const { leads, isLoading: leadsLoading } = useLeads();
  const { stats, visitors, submissions, isLoading: statsLoading } = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Overview</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">Summary &amp; statistics for {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Leads" value={formatNumber(stats.totalLeads)} icon={Users} accent isLoading={statsLoading} />
        <StatCard label="New Submissions (Today)" value={formatNumber(stats.newToday)} icon={FileCheck2} isLoading={statsLoading} />
        <StatCard label="Active Leads" value={formatNumber(stats.activeLeads)} icon={Activity} isLoading={statsLoading} />
        <StatCard label="Website Visitors" value={formatNumber(stats.visitorsThisWeek)} sublabel="This Week" icon={Eye} isLoading={statsLoading} />
        <StatCard label="Average Value" value={formatAed(stats.averageValue)} icon={Wallet} accent isLoading={statsLoading} />
        <StatCard label="WhatsApp Clicks" value={formatNumber(stats.whatsappClicks)} icon={MessageCircle} isLoading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisitorsChart data={visitors} isLoading={statsLoading} />
        <SubmissionsChart data={submissions} isLoading={statsLoading} />
      </div>

      <RecentLeads leads={leads} isLoading={leadsLoading} />
    </div>
  );
}
