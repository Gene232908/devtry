"use client";

import { AreaChart, Area, LabelList, ResponsiveContainer, XAxis, Tooltip, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CHART_MARGIN,
  EmptyChart,
  isEmptySeries,
  lastValueLabel,
  niceDomain,
  RECESSIVE_AXIS,
} from "@/components/admin/chart-parts";
import type { ChartPoint } from "@/lib/admin/use-admin-stats";

export function VisitorsChart({
  data,
  isLoading,
  periodLabel = "This Week",
}: {
  data: ChartPoint[];
  isLoading?: boolean;
  periodLabel?: string;
}) {
  const values = data.map((d) => d.visitors ?? 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fluid-0 text-text">Website Visitors</h3>
        <span className="text-fluid--1 text-text-faint">{periodLabel}</span>
      </div>
      <div className="h-48">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmptySeries(values) ? (
          <EmptyChart message="No visitors yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" {...RECESSIVE_AXIS} fontSize={12} />
              {/* Was `hide`, which left the chart a shape with no scale — the
                  only way to read a figure was to hover it. */}
              <YAxis {...RECESSIVE_AXIS} width={30} allowDecimals={false} domain={niceDomain(values)} />
              <Tooltip
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-gold)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-muted)" }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="var(--gold)"
                strokeWidth={2}
                fill="url(#visitorsFill)"
                // A visible endpoint: with one busy day among six quiet ones the
                // line is otherwise flat with a single spike, and the spike is
                // easy to mistake for the edge of the plot.
                dot={{ r: 3, fill: "var(--gold)", stroke: "var(--gold)" }}
                activeDot={{ r: 5 }}
              >
                <LabelList dataKey="visitors" content={lastValueLabel(data.length)} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
