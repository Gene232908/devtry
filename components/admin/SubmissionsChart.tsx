"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  YAxis,
} from "recharts";
import { CarFront, CheckCircle2, Recycle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CHART_GRID_STYLE,
  CHART_MARGIN,
  EmptyChart,
  isEmptySeries,
  niceDomain,
  RECESSIVE_AXIS,
} from "@/components/admin/chart-parts";
import type { ChartPoint } from "@/lib/admin/use-admin-stats";
import type { ExecutiveOverview } from "@/lib/admin/executive-overview";
import { cn } from "@/lib/utils";

function SubmissionsTooltip({
  active,
  payload,
  comparisonPeriodLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
  periodLabel: string;
  comparisonPeriodLabel?: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const total = Number(point.submissions ?? 0);
  const valuations = Number(point.valuationSubmissions ?? 0);
  const scrap = Number(point.scrapSubmissions ?? 0);
  const compTotal = Number(point.comparisonSubmissions ?? 0);
  const selectedDay = String(point.day ?? "Selected day");

  return (
    <div className="min-w-[220px] rounded-xl border border-white/15 bg-[#121216] p-3 text-xs text-gray-200 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-semibold text-white">{selectedDay}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
          {total} {total === 1 ? "submission" : "submissions"}
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-amber-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-medium">Valuation Requests</span>
          </div>
          <span className="font-bold tabular-nums text-white">{valuations}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-medium">Scrap Inquiries</span>
          </div>
          <span className="font-bold tabular-nums text-white">{scrap}</span>
        </div>

        {comparisonPeriodLabel && compTotal > 0 && (
          <div className="mt-1 flex items-center justify-between rounded-lg border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-slate-300">
            <span>Earlier ({comparisonPeriodLabel})</span>
            <span className="font-semibold tabular-nums text-white">{compTotal}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SubmissionsChart({
  data,
  comparisonData,
  isLoading,
  periodLabel = "New Submissions",
  comparisonPeriodLabel,
}: {
  data: ChartPoint[];
  comparisonData?: ExecutiveOverview["trend"];
  isLoading?: boolean;
  periodLabel?: string;
  comparisonPeriodLabel?: string;
}) {
  const [filterType, setFilterType] = useState<"all" | "valuation" | "scrap">("all");

  const chartData = data.map((point, index) => ({
    ...point,
    valuationSubmissions: point.valuationSubmissions ?? 0,
    scrapSubmissions: point.scrapSubmissions ?? 0,
    comparisonSubmissions: comparisonData?.[index]?.submissions ?? 0,
    comparisonDay: comparisonData?.[index]?.day,
  }));
  const values = chartData.flatMap((d) => [d.submissions ?? 0, d.comparisonSubmissions ?? 0]);
  const currentTotalSubmissions = data.reduce((sum, v) => sum + (v.submissions || 0), 0);
  const currentValuationSubmissions = data.reduce((sum, v) => sum + (v.valuationSubmissions || 0), 0);
  const currentScrapSubmissions = data.reduce((sum, v) => sum + (v.scrapSubmissions || 0), 0);
  const isSingleDay = data.length === 1;
  const comparisonSubmissions = comparisonData?.reduce((sum, item) => sum + item.submissions, 0);

  const todaySubmissions = data[0]?.submissions ?? 0;
  const todayValuations = data[0]?.valuationSubmissions ?? 0;
  const todayScrap = data[0]?.scrapSubmissions ?? 0;
  const todayVisitors = data[0]?.visitors ?? 0;
  const conversionRate = todayVisitors > 0 ? ((todaySubmissions / todayVisitors) * 100).toFixed(1) : "0.0";

  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-amber-500/30">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <CarFront className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Car Submissions</h3>
            <span className="text-xs text-gray-400">Completed valuation & scrap inquiries</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick filter tabs to view All, Valuation Only, or Scrap Only */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={cn(
                "rounded-md px-2.5 py-0.5 font-medium transition-all",
                filterType === "all" ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              All ({currentTotalSubmissions})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("valuation")}
              className={cn(
                "rounded-md px-2.5 py-0.5 font-medium transition-all",
                filterType === "valuation" ? "bg-amber-500/25 text-amber-300 shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Valuation ({currentValuationSubmissions})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("scrap")}
              className={cn(
                "rounded-md px-2.5 py-0.5 font-medium transition-all",
                filterType === "scrap" ? "bg-emerald-500/25 text-emerald-300 shadow-sm" : "text-gray-400 hover:text-white"
              )}
            >
              Scrap ({currentScrapSubmissions})
            </button>
          </div>

          {comparisonSubmissions !== undefined && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-white/10">
              Earlier: {comparisonSubmissions}
            </span>
          )}
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-300 border border-white/10">
            {periodLabel}
          </span>
        </div>
      </div>

      <div className="h-48">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmptySeries(values) ? (
          <EmptyChart message="No submissions recorded yet" />
        ) : isSingleDay ? (
          // HIGH-IMPACT EXECUTIVE 2-CARD LAYOUT FOR SINGLE-DAY / TODAY
          <div className="flex h-full flex-col justify-center">
            <div className="grid grid-cols-2 gap-3 h-full">
              {/* Card 1: New Submissions Volume with Valuation vs Scrap Breakdown */}
              <div className="flex flex-col justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    <CarFront className="h-3.5 w-3.5 text-amber-400" />
                    New Inquiries ({todaySubmissions})
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-white/10">
                    {data[0].day}
                  </span>
                </div>

                <div className="my-auto flex flex-col gap-1.5 py-1">
                  <Link
                    href="/admin/leads"
                    className="group flex items-center justify-between rounded-lg border border-amber-500/20 bg-black/30 px-3 py-1.5 transition-all hover:border-amber-500/50 hover:bg-amber-500/10"
                    title="View Regular Valuation Leads"
                  >
                    <div className="flex items-center gap-2">
                      <CarFront className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-medium text-gray-200 group-hover:text-amber-300">
                        Valuation Requests
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-amber-400">
                      {todayValuations}
                    </span>
                  </Link>

                  <Link
                    href="/admin/leads?origin=scrap"
                    className="group flex items-center justify-between rounded-lg border border-gold/25 bg-black/30 px-3 py-1.5 transition-all hover:border-gold/50 hover:bg-gold/10"
                    title="View Scrap Inquiries"
                  >
                    <div className="flex items-center gap-2">
                      <Recycle className="h-3.5 w-3.5 text-gold" />
                      <span className="text-xs font-medium text-gray-200 group-hover:text-gold">
                        Scrap Inquiries
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-gold">
                      {todayScrap}
                    </span>
                  </Link>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-gray-400">
                  <span>Direct website submissions</span>
                  <span className="text-amber-400/80">Click to filter →</span>
                </div>
              </div>

              {/* Card 2: Conversion Efficiency */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Lead Intake
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    {conversionRate}% Rate
                  </span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center py-1">
                  <div className="flex items-baseline justify-center gap-1.5 font-sans">
                    <span className="text-2xl font-semibold tracking-tight tabular-nums text-emerald-400">
                      {todaySubmissions > 0 ? "Active" : "Quiet"}
                    </span>
                    <span className="text-xs text-emerald-300/80">
                      pipeline flow
                    </span>
                  </div>
                  {/* Progress Bar showing traffic-to-lead efficiency */}
                  <div className="w-full max-w-[140px] bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(8, Number(conversionRate) * 2))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-300/80 mt-1.5 text-center">
                    {todaySubmissions} lead{todaySubmissions === 1 ? "" : "s"} from {todayVisitors} visitor{todayVisitors === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="text-center text-[10px] text-gray-400 border-t border-white/10 pt-1.5">
                  Ready for agent call & inspection
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="valuationBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="scrapBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="day" {...RECESSIVE_AXIS} fontSize={12} tick={{ fill: "#E5E7EB" }} />
              <YAxis
                {...RECESSIVE_AXIS}
                width={30}
                allowDecimals={false}
                domain={niceDomain(values)}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                content={(props) => (
                  <SubmissionsTooltip
                    {...props}
                    periodLabel={periodLabel}
                    comparisonPeriodLabel={comparisonPeriodLabel}
                  />
                )}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={24}
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", color: "#E5E7EB" }}
              />
              {filterType !== "scrap" && (
                <Bar
                  dataKey="valuationSubmissions"
                  name="Valuation"
                  stackId={filterType === "all" ? "submissions" : undefined}
                  fill="url(#valuationBarGrad)"
                  maxBarSize={comparisonData ? 24 : 44}
                  radius={filterType === "valuation" ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {filterType !== "valuation" && (
                <Bar
                  dataKey="scrapSubmissions"
                  name="Scrap"
                  stackId={filterType === "all" ? "submissions" : undefined}
                  fill="url(#scrapBarGrad)"
                  maxBarSize={comparisonData ? 24 : 44}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {comparisonData && (
                <Bar
                  dataKey="comparisonSubmissions"
                  name={`Earlier: ${comparisonPeriodLabel ?? "Comparison"}`}
                  fill="#64748B"
                  maxBarSize={24}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
