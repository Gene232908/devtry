"use client";

import {
  AreaChart,
  Area,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  YAxis,
} from "recharts";
import { Users, Globe, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CHART_GRID_STYLE,
  CHART_MARGIN,
  ComparisonDayTooltip,
  EmptyChart,
  isEmptySeries,
  lastValueLabel,
  niceDomain,
  RECESSIVE_AXIS,
} from "@/components/admin/chart-parts";
import type { ChartPoint } from "@/lib/admin/use-admin-stats";
import type { ExecutiveOverview } from "@/lib/admin/executive-overview";

export function VisitorsChart({
  data,
  comparisonData,
  isLoading,
  periodLabel = "This Week",
  comparisonPeriodLabel,
}: {
  data: ChartPoint[];
  comparisonData?: ExecutiveOverview["trend"];
  isLoading?: boolean;
  periodLabel?: string;
  comparisonPeriodLabel?: string;
}) {
  const chartData = data.map((point, index) => ({
    ...point,
    comparisonVisitors: comparisonData?.[index]?.visitors ?? 0,
    comparisonDay: comparisonData?.[index]?.day,
  }));
  const values = chartData.flatMap((d) => [d.visitors ?? 0, d.comparisonVisitors ?? 0]);
  const currentTotalVisitors = data.reduce((sum, v) => sum + (v.visitors || 0), 0);
  const isSingleDay = data.length === 1;
  const comparisonVisitors = comparisonData?.reduce((sum, item) => sum + (item.visitors || 0), 0);

  const todayVisitors = data[0]?.visitors ?? 0;
  const todaySubmissions = data[0]?.submissions ?? 0;
  const conversionRate = todayVisitors > 0 ? ((todaySubmissions / todayVisitors) * 100).toFixed(1) : "0.0";
  const compVisitors = comparisonData?.[0]?.visitors;
  const compSubmissions = comparisonData?.[0]?.submissions;

  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-cyan-500/30">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Website Visitors</h3>
            <span className="text-xs text-gray-400">Unique sessions recorded</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/25">
            {currentTotalVisitors} {currentTotalVisitors === 1 ? "visitor" : "visitors"}
          </span>
          {comparisonVisitors !== undefined && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-white/10">
              Earlier: {comparisonVisitors}
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
          <EmptyChart message="No visitors recorded yet" />
        ) : isSingleDay ? (
          // HIGH-IMPACT EXECUTIVE 2-CARD LAYOUT FOR SINGLE-DAY / TODAY
          <div className="flex h-full flex-col justify-center">
            <div className="grid grid-cols-2 gap-3 h-full">
              {/* Card 1: Traffic Sessions */}
              <div className="flex flex-col justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                    <Globe className="h-3.5 w-3.5 text-cyan-400" />
                    Daily Traffic
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-white/10">
                    {data[0].day}
                  </span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center py-1">
                  <div className="flex items-baseline justify-center gap-1.5 font-sans">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums text-white">
                      {todayVisitors}
                    </span>
                    <span className="text-xs text-gray-400">
                      {todayVisitors === 1 ? "visitor" : "visitors"}
                    </span>
                  </div>
                  {compVisitors !== undefined && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      vs <strong className="text-gray-200">{compVisitors}</strong> prior
                    </p>
                  )}
                  <p className="text-[11px] text-gray-300 mt-0.5">Unique sessions logged</p>
                </div>

                <div className="text-center text-[10px] text-gray-400 border-t border-white/10 pt-1.5">
                  Active web visits for this date
                </div>
              </div>

              {/* Card 2: Conversion to Submissions */}
              <div className="flex flex-col justify-between rounded-xl border border-blue-500/25 bg-blue-500/5 p-3.5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                    <Target className="h-3.5 w-3.5 text-blue-400" />
                    Conversion Rate
                  </span>
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                    {conversionRate}%
                  </span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center py-1">
                  <div className="flex items-baseline justify-center gap-1.5 font-sans">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums text-blue-400">
                      {todaySubmissions}
                    </span>
                    <span className="text-xs text-blue-300/80">
                      {todaySubmissions === 1 ? "car inquiry" : "car inquiries"}
                    </span>
                  </div>
                  {compSubmissions !== undefined && (
                    <p className="text-[11px] text-blue-300/80 mt-0.5">
                      vs <strong className="text-blue-200">{compSubmissions}</strong> prior
                    </p>
                  )}
                  {/* Progress Bar */}
                  <div className="w-full max-w-[140px] bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(8, Number(conversionRate)))}%` }}
                    />
                  </div>
                </div>

                <div className="text-center text-[10px] text-gray-400 border-t border-white/10 pt-1.5">
                  {todaySubmissions} lead{todaySubmissions === 1 ? "" : "s"} from {todayVisitors} visitor{todayVisitors === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // MULTI-DAY AREA CHART
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.0} />
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
                content={(props) => <ComparisonDayTooltip {...props} selectedLabel={periodLabel} comparisonLabel={comparisonPeriodLabel} selectedValueKey="visitors" comparisonValueKey="comparisonVisitors" valueLabel="visitors" />}
              />
              {comparisonData && (
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={24}
                  iconType="plainline"
                  wrapperStyle={{ fontSize: "11px", color: "#E5E7EB" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="visitors"
                name={`Selected: ${periodLabel}`}
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fill="url(#visitorsFill)"
                dot={{ r: 3.5, fill: "#0EA5E9", stroke: "#141416", strokeWidth: 2 }}
                activeDot={{ r: 5.5, fill: "#38BDF8", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              >
                <LabelList dataKey="visitors" content={lastValueLabel(data.length)} />
              </Area>
              {comparisonData && (
                <Area
                  type="monotone"
                  dataKey="comparisonVisitors"
                  name={`Earlier: ${comparisonPeriodLabel ?? "Comparison"}`}
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
