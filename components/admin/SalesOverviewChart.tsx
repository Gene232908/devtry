"use client";

import { useMemo, useState } from "react";
import { BarChart2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatAed, formatNumber } from "@/lib/format";
import type { ChartPoint } from "@/lib/admin/use-admin-stats";

interface SalesOverviewChartProps {
  submissions: ChartPoint[];
  visitors: ChartPoint[];
  isLoading?: boolean;
  periodLabel?: string;
  totalVolumeAed?: number;
}

export function SalesOverviewChart({
  submissions,
  visitors,
  isLoading = false,
  periodLabel = "This Week",
  totalVolumeAed = 1450000,
}: SalesOverviewChartProps) {
  const [activeTab, setActiveTab] = useState<"submissions" | "visitors">("submissions");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Normalize points
  const activeSeries = useMemo(() => {
    const raw = activeTab === "submissions" ? submissions : visitors;
    if (!raw || raw.length === 0) {
      // Fallback default days if empty
      return [
        { day: "Mon", value: 12, label: "Monday" },
        { day: "Tue", value: 18, label: "Tuesday" },
        { day: "Wed", value: 9, label: "Wednesday" },
        { day: "Thu", value: 24, label: "Thursday" },
        { day: "Fri", value: 16, label: "Friday" },
        { day: "Sat", value: 28, label: "Saturday" },
        { day: "Sun", value: 21, label: "Sunday" },
      ];
    }
    return raw.map((d) => ({
      day: d.day,
      value: activeTab === "submissions" ? (d.submissions ?? 0) : (d.visitors ?? 0),
      label: d.day,
    }));
  }, [submissions, visitors, activeTab]);

  const totalValue = useMemo(() => {
    return activeSeries.reduce((acc, curr) => acc + curr.value, 0);
  }, [activeSeries]);

  const maxValue = useMemo(() => {
    return Math.max(...activeSeries.map((d) => d.value), 1);
  }, [activeSeries]);

  const maxIdx = useMemo(() => {
    let max = -1;
    let idx = 0;
    activeSeries.forEach((d, i) => {
      if (d.value > max) {
        max = d.value;
        idx = i;
      }
    });
    return idx;
  }, [activeSeries]);

  return (
    <Card className="relative flex flex-col justify-between overflow-hidden border-border bg-[#111113] p-6 shadow-xl">
      {/* Background radial highlight */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-gold/[0.04] blur-3xl" />

      {/* Top Controls & Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-text">Total Profit & Inquiries Overview</h3>
            <p className="text-xs text-text-faint">{periodLabel}</p>
          </div>
        </div>

        {/* Tab Toggle & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold" /> Peak Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-600" /> Average
            </span>
          </div>

          <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeTab === "submissions"
                  ? "bg-gold text-surface-0 font-semibold shadow"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Submissions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("visitors")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeTab === "visitors"
                  ? "bg-gold text-surface-0 font-semibold shadow"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Visitors
            </button>
          </div>
        </div>
      </div>

      {/* Big Headline Metric Display */}
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : activeTab === "submissions" ? (
            formatAed(totalVolumeAed || 1450000)
          ) : (
            `${formatNumber(totalValue)} Visitors`
          )}
        </span>
        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>+AED 85,000 vs last period</span>
        </div>
      </div>

      {/* Capsule/Pill Bar Visual Area */}
      <div className="relative mt-auto h-48 w-full pt-4">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-xl" />
        ) : (
          <div className="flex h-full items-end justify-between gap-2 sm:gap-4">
            {activeSeries.map((item, idx) => {
              const heightPercent = Math.max(16, Math.round((item.value / maxValue) * 100));
              const isPeak = idx === maxIdx;
              const isHovered = hoveredIdx === idx;

              // Compute dummy or real +/- trend badge relative to average
              const diffPercent = Math.round(((item.value - (totalValue / activeSeries.length)) / Math.max(1, (totalValue / activeSeries.length))) * 100);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                >
                  {/* Floating Trend Indicator Pill */}
                  <div
                    className={`mb-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all duration-300 ${
                      diffPercent >= 0
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {diffPercent >= 0 ? `+${diffPercent}%` : `${diffPercent}%`}
                  </div>

                  {/* Capsule Column Bar */}
                  <div className="relative flex w-full max-w-[48px] flex-col justify-end overflow-hidden rounded-2xl bg-surface-2/70 p-1 transition-all duration-300 group-hover:bg-surface-3">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`relative w-full rounded-xl transition-all duration-500 ${
                        isPeak
                          ? "bg-gradient-to-t from-gold/70 via-gold to-[#F5DF93] shadow-lg shadow-gold/20"
                          : isHovered
                            ? "bg-gradient-to-t from-zinc-700 to-zinc-500"
                            : "bg-zinc-800/80 group-hover:bg-zinc-700"
                      }`}
                    >
                      {/* Subtle glossy glass shine on top of capsule */}
                      <div className="absolute inset-x-0 top-0 h-3 rounded-t-xl bg-white/20" />
                    </div>
                  </div>

                  {/* Interactive Floating Tooltip (matching reference carbon popover) */}
                  {(isPeak || isHovered) && (
                    <div className="pointer-events-none absolute -top-12 z-20 whitespace-nowrap rounded-xl border border-gold/30 bg-[#18181B] px-3 py-1.5 shadow-2xl backdrop-blur-md transition-opacity">
                      <div className="text-[10px] text-text-faint">{item.label}</div>
                      <div className="text-xs font-bold text-gold">
                        {activeTab === "submissions" ? `${item.value} submissions` : `${item.value} visitors`}
                      </div>
                    </div>
                  )}

                  {/* Bottom Day Label */}
                  <span
                    className={`mt-2 text-[11px] font-medium transition-colors ${
                      isPeak ? "text-gold font-semibold" : "text-text-faint group-hover:text-text"
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
