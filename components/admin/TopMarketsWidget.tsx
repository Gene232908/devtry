"use client";

import { useMemo } from "react";
import { Globe } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatAed, formatNumber } from "@/lib/format";
import type { Lead } from "@/config/mock-data";

interface TopMarketsWidgetProps {
  leads: Lead[];
  isLoading?: boolean;
}

const DEFAULT_MARKETS = [
  { name: "Dubai", share: 45, volume: 1850000, count: 28 },
  { name: "Abu Dhabi", share: 28, volume: 1120000, count: 18 },
  { name: "Sharjah", share: 15, volume: 540000, count: 9 },
  { name: "Ajman", share: 8, volume: 290000, count: 5 },
  { name: "Ras Al Khaimah", share: 4, volume: 160000, count: 3 },
];

export function TopMarketsWidget({ leads, isLoading = false }: TopMarketsWidgetProps) {
  const markets = useMemo(() => {
    if (!leads || leads.length === 0) return DEFAULT_MARKETS;

    const countByEmirate: Record<string, { count: number; volume: number }> = {};
    leads.forEach((l) => {
      const em = l.location || "Dubai";
      if (!countByEmirate[em]) countByEmirate[em] = { count: 0, volume: 0 };
      countByEmirate[em].count += 1;
      countByEmirate[em].volume += l.estimatedValueAed || 120000;
    });

    const totalLeads = leads.length;
    return Object.entries(countByEmirate)
      .map(([name, data]) => ({
        name,
        count: data.count,
        volume: data.volume,
        share: Math.round((data.count / totalLeads) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [leads]);

  return (
    <Card className="flex flex-col justify-between border-border bg-[#111113] p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Globe className="h-4 w-4" />
          </div>
          <h3 className="font-medium text-text">Top Markets (Emirates)</h3>
        </div>
        <span className="text-xs text-text-faint">UAE Region</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
        {markets.map((market, idx) => (
          <div
            key={market.name}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-2/40 px-3 py-2 transition-colors hover:border-gold/30 hover:bg-surface-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold text-gold">
                {idx + 1}
              </span>
              <div>
                <div className="text-xs font-medium text-text">{market.name}</div>
                <div className="text-[10px] text-text-muted">{formatNumber(market.count)} leads</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-text">{formatAed(market.volume)}</span>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                {market.share}%
              </span>
            </div>
          </div>
        ))}
        </div>
      )}
    </Card>
  );
}
