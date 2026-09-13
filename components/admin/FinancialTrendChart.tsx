"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Coins, Percent } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CHART_GRID_STYLE,
  EmptyChart,
  isEmptySeries,
  RECESSIVE_AXIS,
} from "@/components/admin/chart-parts";
import type { ExecutiveOverview } from "@/lib/admin/executive-overview";

type FinancialChartPoint = ExecutiveOverview["trend"][number] & {
  comparisonRevenue?: number;
  comparisonProfit?: number;
  comparisonDay?: string;
};

function formatAedShort(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

function formatAedFull(value: number) {
  return `AED ${Math.round(value).toLocaleString("en-AE")}`;
}

function FinancialComparisonTooltip({
  active,
  payload,
  periodLabel,
  comparisonPeriodLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: FinancialChartPoint }>;
  periodLabel: string;
  comparisonPeriodLabel?: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-[250px] rounded-xl border border-white/15 bg-[#121216] p-3 text-xs text-gray-200 shadow-2xl">
      <p className="font-semibold text-white">{point.day}</p>
      {point.comparisonDay && comparisonPeriodLabel && (
        <p className="mt-1 text-[11px] leading-snug text-gray-400">
          This day is compared with <span className="font-semibold text-slate-200">{point.comparisonDay}</span> from the earlier period.
        </p>
      )}
      <div className="mt-3 grid gap-2">
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-2">
          <p className="font-medium text-amber-300">Selected: {periodLabel}</p>
          <p className="mt-1 text-gray-300">Revenue <span className="float-right font-semibold text-white">{formatAedFull(point.revenue)}</span></p>
          <p className="mt-1 text-gray-300">Gross profit <span className="float-right font-semibold text-emerald-300">{formatAedFull(point.profit)}</span></p>
        </div>
        {comparisonPeriodLabel && (
          <div className="rounded-lg border border-slate-400/20 bg-slate-400/10 px-2.5 py-2">
            <p className="font-medium text-slate-300">Earlier: {comparisonPeriodLabel}</p>
            <p className="mt-1 text-gray-300">Revenue <span className="float-right font-semibold text-white">{formatAedFull(point.comparisonRevenue ?? 0)}</span></p>
            <p className="mt-1 text-gray-300">Gross profit <span className="float-right font-semibold text-slate-100">{formatAedFull(point.comparisonProfit ?? 0)}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

export function FinancialTrendChart({
  data,
  comparisonData,
  periodLabel,
  comparisonPeriodLabel,
  isLoading,
}: {
  data: ExecutiveOverview["trend"];
  comparisonData?: ExecutiveOverview["trend"];
  periodLabel: string;
  comparisonPeriodLabel?: string;
  isLoading?: boolean;
}) {
  const isSingleDay = data.length === 1;
  const values = data.flatMap((point) => [point.revenue, point.profit]);
  const totalRevenue = data.reduce((acc, point) => acc + (point.revenue || 0), 0);
  const totalProfit = data.reduce((acc, point) => acc + (point.profit || 0), 0);
  const marginPercent =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const comparisonRevenue = comparisonData?.reduce((acc, point) => acc + (point.revenue || 0), 0);
  const comparisonProfit = comparisonData?.reduce((acc, point) => acc + (point.profit || 0), 0);

  const compRevList = comparisonData ? comparisonData.map((d) => d.revenue) : [];
  const compProfitList = comparisonData ? comparisonData.map((d) => d.profit) : [];
  const maxRev = Math.max(0, ...data.map((d) => d.revenue), ...compRevList);
  const maxProfit = Math.max(0, ...data.map((d) => d.profit), ...compProfitList);

  const revDomain: [number, number] = [0, Math.max(2000, Math.ceil((maxRev * 1.15) / 1000) * 1000)];
  const profitDomain: [number, number] = [0, Math.max(500, Math.ceil((maxProfit * 1.25) / 500) * 500)];

  const chartData = data.map((point, index) => ({
    ...point,
    comparisonRevenue: comparisonData?.[index]?.revenue,
    comparisonProfit: comparisonData?.[index]?.profit,
    comparisonDay: comparisonData?.[index]?.day,
  }));

  const headerBadge = totalRevenue > 0 ? (
    <div className="hidden sm:flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
        <TrendingUp className="h-3 w-3" />
        {marginPercent}% Margin
      </span>
    </div>
  ) : null;

  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-fluid-0 text-text tracking-tight">Sales and Profit</h3>
          {headerBadge}
        </div>
        <div className="flex items-center gap-2">
          {periodLabel && (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-300 border border-white/10">
              {periodLabel}
            </span>
          )}
        </div>
      </div>

      {/* Quick Status Sub-header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
            <span className="text-gray-300">Revenue:</span>
            <span className="font-semibold text-white tabular-nums">{formatAedFull(totalRevenue)}</span>
            {comparisonData && (
              <span className="text-gray-400 font-normal">
                vs <strong className="text-gray-200">{formatAedFull(comparisonRevenue ?? 0)}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            <span className="text-emerald-400 font-medium">Gross Profit:</span>
            <span className="font-bold text-emerald-400 tabular-nums">{formatAedFull(totalProfit)}</span>
            {comparisonData && (
              <span className="text-gray-400 font-normal">
                vs <strong className="text-emerald-300">{formatAedFull(comparisonProfit ?? 0)}</strong>
              </span>
            )}
          </div>
        </div>
        {comparisonData && (
          <span className="text-[11px] font-medium text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
            Comparing 2 periods
          </span>
        )}
      </div>

      {comparisonData && (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-medium text-gray-200">How to read the comparison:</span>
            <span className="flex items-center gap-1.5 text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-400" />Selected: {data[0]?.day}–{data.at(-1)?.day}</span>
            <span className="flex items-center gap-1.5 text-slate-300"><span className="h-2 w-2 rounded-full bg-slate-400" />Earlier: {comparisonData[0]?.day}–{comparisonData.at(-1)?.day}</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Hover any day to see its exact matching date in the earlier period.</p>
        </div>
      )}

      <div className="h-64">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmptySeries(values) ? (
          <EmptyChart message="No completed sales in this period" />
        ) : isSingleDay ? (
          // HIGH VISIBILITY SINGLE-DAY / TODAY COMPARISON
          <div className="flex h-full flex-col justify-center px-1 py-1">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 h-full">
              {/* Revenue Card/Bar */}
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-amber-500/5 p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                    <Coins className="h-3.5 w-3.5" />
                    Revenue
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-white/10">
                    {data[0].day}
                  </span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center py-2">
                  <div className="w-full max-w-[120px] h-20 rounded-lg bg-gradient-to-t from-amber-600/70 to-amber-400/90 flex items-center justify-center border border-amber-300/40">
                    <Coins className="h-8 w-8 text-black/80" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-center gap-1 font-sans">
                    <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#a39c90] select-none">
                      AED
                    </span>
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-[#f5f3ef]">
                      {Math.round(data[0].revenue).toLocaleString("en-AE")}
                    </span>
                  </div>
                  {comparisonData && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      vs {formatAedFull(comparisonRevenue ?? 0)} prior
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-0.5">Total Sales Revenue</p>
                </div>

                <div className="text-center text-[11px] text-gray-400 border-t border-white/10 pt-2">
                  {data[0].sold} Completed Sale{data[0].sold === 1 ? "" : "s"}
                </div>
              </div>

              {/* Gross Profit Card/Bar - 100% PROMINENT & GLOWING */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    Gross Profit
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/40">
                    {marginPercent}% Margin
                  </span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center py-2">
                  <div className="w-full max-w-[120px] h-20 rounded-lg bg-gradient-to-t from-emerald-600/70 to-emerald-400/90 flex items-center justify-center border border-emerald-300/40">
                    <Percent className="h-8 w-8 text-black/80" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-center gap-1 font-sans">
                    <span className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-400/80 select-none">
                      AED
                    </span>
                    <span className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-emerald-400">
                      {Math.round(data[0].profit).toLocaleString("en-AE")}
                    </span>
                  </div>
                  {comparisonData && (
                    <p className="text-xs text-emerald-300/80 mt-0.5">
                      vs {formatAedFull(comparisonProfit ?? 0)} prior
                    </p>
                  )}
                  <p className="text-xs text-emerald-300 mt-0.5 font-medium">Profit from sales</p>
                </div>

                <div className="text-center text-[11px] text-gray-400 border-t border-white/10 pt-2">
                  Sale price minus acquisition cost
                </div>
              </div>
            </div>
          </div>
        ) : (
          // MULTI-DAY DUAL-AXIS COMPOSED CHART WITH COMPARISON SERIES
          <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
            <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#B45309" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="day" {...RECESSIVE_AXIS} />
              {/* Left Y-Axis for Revenue */}
              <YAxis
                yAxisId="rev"
                orientation="left"
                {...RECESSIVE_AXIS}
                width={48}
                domain={revDomain}
                tickFormatter={formatAedShort}
              />
              {/* Right Y-Axis for Gross Profit */}
              <YAxis
                yAxisId="profit"
                orientation="right"
                {...RECESSIVE_AXIS}
                width={48}
                domain={profitDomain}
                tickFormatter={formatAedShort}
              />
              <Tooltip
                content={(props) => <FinancialComparisonTooltip {...props} periodLabel={periodLabel} comparisonPeriodLabel={comparisonPeriodLabel} />}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingBottom: "6px" }}
              />
              {/* Revenue Bar (Selected Period) */}
              <Bar
                yAxisId="rev"
                dataKey="revenue"
                name={comparisonData ? `Revenue (${periodLabel})` : "Revenue"}
                fill="url(#revBarGrad)"
                maxBarSize={comparisonData ? 22 : 36}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              {/* Revenue Bar (Comparison Period) */}
              {comparisonData && (
                <Bar
                  yAxisId="rev"
                  dataKey="comparisonRevenue"
                  name={`Revenue (Earlier: ${comparisonPeriodLabel ?? "Comparison"})`}
                  fill="#64748B"
                  opacity={0.75}
                  maxBarSize={22}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              )}
              {/* Gross Profit Area */}
              <Area
                yAxisId="profit"
                type="monotone"
                dataKey="profit"
                fill="url(#profitAreaGrad)"
                stroke="none"
                legendType="none"
                isAnimationActive={false}
              />
              {/* Gross Profit Line (Selected Period) */}
              <Line
                yAxisId="profit"
                type="monotone"
                dataKey="profit"
                name={comparisonData ? `Gross Profit (${periodLabel})` : "Gross Profit"}
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10B981", stroke: "#18181b", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#34D399", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {/* Gross Profit Line (Comparison Period) */}
              {comparisonData && (
                <Line
                  yAxisId="profit"
                  type="monotone"
                  dataKey="comparisonProfit"
                  name={`Gross Profit (Earlier: ${comparisonPeriodLabel ?? "Comparison"})`}
                  stroke="#94A3B8"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3.5, fill: "#94A3B8", stroke: "#18181b", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "#CBD5E1", stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
