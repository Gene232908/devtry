"use client";

import { useMemo } from "react";
import { Award, Car } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Lead } from "@/config/mock-data";

interface TopMakesWidgetProps {
  leads: Lead[];
  isLoading?: boolean;
}

const DEFAULT_MAKES = [
  { name: "Mercedes-Benz", model: "G-Class / E-Class", count: 18, growth: "+16%" },
  { name: "Porsche", model: "911 / Cayenne", count: 14, growth: "+22%" },
  { name: "Nissan", model: "Patrol Platinum", count: 12, growth: "+8%" },
  { name: "Lamborghini", model: "Urus / Huracan", count: 9, growth: "+14%" },
];

export function TopMakesWidget({ leads, isLoading = false }: TopMakesWidgetProps) {
  const topMakes = useMemo(() => {
    if (!leads || leads.length === 0) return DEFAULT_MAKES;

    const byMake: Record<string, { count: number; models: Record<string, number> }> = {};
    leads.forEach((l) => {
      const make = l.make || "Luxury Auto";
      const model = l.model || "";
      if (!byMake[make]) byMake[make] = { count: 0, models: {} };
      byMake[make].count += 1;
      if (model) byMake[make].models[model] = (byMake[make].models[model] || 0) + 1;
    });

    return Object.entries(byMake)
      .map(([make, data]) => {
        const topModel = Object.entries(data.models).sort((a, b) => b[1] - a[1])[0]?.[0] || "All Models";
        return {
          name: make,
          model: topModel,
          count: data.count,
          growth: `+${Math.min(35, Math.max(5, data.count * 4))}%`,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
  }, [leads]);

  return (
    <Card className="flex flex-col justify-between border-border bg-[#111113] p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Award className="h-4 w-4" />
          </div>
          <h3 className="font-medium text-text">Top Vehicle Makes</h3>
        </div>
        <span className="text-xs text-text-faint">In Demand</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-xl bg-surface-2 animate-pulse" />
          <div className="h-28 rounded-xl bg-surface-2 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
        {topMakes.map((item, idx) => (
          <div
            key={item.name}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 transition-all ${
              idx === 0
                ? "border-gold/40 bg-gradient-to-br from-[#1A1813] to-surface-2 shadow-md shadow-gold/5"
                : "border-border/70 bg-surface-2/60"
            }`}
          >
            {/* Background subtle badge */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-gold">
                <Car className="h-4 w-4" />
              </div>
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                {item.growth}
              </span>
            </div>

            <div>
              <div className="truncate text-xs font-bold text-text">{item.name}</div>
              <div className="truncate text-[10px] text-text-muted">{item.model}</div>
            </div>

            <div className="mt-2 text-[11px] font-semibold text-gold">
              {item.count} Inquiries
            </div>
          </div>
        ))}
        </div>
      )}
    </Card>
  );
}
