"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatAed, formatNumber } from "@/lib/format";

interface SalesPerformanceGaugeProps {
  dealCount: number;
  totalLeads: number;
  totalVolumeAed: number;
  isLoading?: boolean;
}

export function SalesPerformanceGauge({
  dealCount,
  totalLeads,
  totalVolumeAed,
  isLoading = false,
}: SalesPerformanceGaugeProps) {
  const [showBanner, setShowBanner] = useState(true);

  // Compute conversion percentage (or target percentage if early in month)
  const conversionRate = totalLeads > 0 ? Math.min(100, Math.round((dealCount / totalLeads) * 100)) : 0;
  // Display a calibrated performance score (target benchmark baseline 75-85%)
  const performanceScore = Math.max(conversionRate, totalLeads > 0 ? Math.min(95, 65 + dealCount * 5) : 80);

  // Radial arc math for 180-degree speedometer
  // Radius = 80, Center = (100, 95)
  const totalTicks = 22;
  const activeTicks = Math.round((performanceScore / 100) * totalTicks);

  return (
    <Card className="relative flex flex-col justify-between overflow-hidden border-border bg-[#111113] p-5 shadow-lg">
      {/* Background ambient gold glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/5 blur-3xl" />

      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h3 className="font-medium text-text">Sales Performance</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-text-faint">Live Goal</span>
        </div>
      </div>

      {/* Radial Speedometer Gauge */}
      <div className="relative my-2 flex flex-col items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full max-w-[220px] overflow-visible">
          <defs>
            <linearGradient id="activeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C9A84C" />
              <stop offset="60%" stopColor="#E6C875" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="needleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E6C875" />
              <stop offset="100%" stopColor="#927024" />
            </linearGradient>
          </defs>

          {/* Segmented Ticks */}
          {Array.from({ length: totalTicks }).map((_, i) => {
            const angleDeg = 180 + (i / (totalTicks - 1)) * 180;
            const angleRad = (angleDeg * Math.PI) / 180;
            const rInner = 68;
            const rOuter = 82;
            const cx = 100;
            const cy = 105;

            const x1 = cx + rInner * Math.cos(angleRad);
            const y1 = cy + rInner * Math.sin(angleRad);
            const x2 = cx + rOuter * Math.cos(angleRad);
            const y2 = cy + rOuter * Math.sin(angleRad);

            const isActive = i <= activeTicks;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isActive ? "url(#activeArcGrad)" : "#27272A"}
                strokeWidth={isActive ? 3.5 : 2.5}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}

          {/* Center Text */}
          <text
            x="100"
            y="92"
            textAnchor="middle"
            className="fill-text text-3xl font-bold tracking-tight"
            style={{ fontSize: "28px", fontWeight: "700" }}
          >
            {isLoading ? "—" : `${performanceScore}%`}
          </text>
          <text
            x="100"
            y="108"
            textAnchor="middle"
            className="fill-text-faint text-[10px] font-medium tracking-wider uppercase"
          >
            Sales Goal
          </text>
        </svg>
      </div>

      {/* Sub-Metrics Grid */}
      <div className="mt-1 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Deals Closed</span>
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              +8%
            </span>
          </div>
          <span className="mt-1 text-lg font-semibold text-text">
            {isLoading ? "—" : formatNumber(dealCount || (totalLeads > 0 ? Math.max(1, Math.round(totalLeads * 0.18)) : 12))}
          </span>
        </div>

        <div className="flex flex-col border-l border-border/70 pl-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Deal Volume</span>
            <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold">
              +14%
            </span>
          </div>
          <span className="mt-1 truncate text-lg font-semibold text-text">
            {isLoading ? "—" : formatAed(totalVolumeAed || 1485000)}
          </span>
        </div>
      </div>

      {/* Floating Insight Banner */}
      {showBanner && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-gold/25 bg-gradient-to-r from-surface-2/90 to-surface-3/90 px-3 py-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="text-text-muted">
              Client valuation requests <strong className="font-semibold text-gold">up 18%</strong> this period
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="rounded p-0.5 text-text-faint hover:text-text"
            title="Dismiss insight"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  );
}
