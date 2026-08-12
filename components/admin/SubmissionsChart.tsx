"use client";

import { BarChart, Bar, LabelList, ResponsiveContainer, XAxis, Tooltip, YAxis } from "recharts";
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

export function SubmissionsChart({ data, isLoading }: { data: ChartPoint[]; isLoading?: boolean }) {
  const values = data.map((d) => d.submissions ?? 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fluid-0 text-text">Car Submissions</h3>
        <span className="text-fluid--1 text-text-faint">New Submissions</span>
      </div>
      <div className="h-48">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmptySeries(values) ? (
          <EmptyChart message="No submissions yet" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={CHART_MARGIN}>
              <XAxis dataKey="day" {...RECESSIVE_AXIS} fontSize={12} />
              {/* Same reasoning as the Visitors chart: a hidden axis left the
                  counts readable only on hover. */}
              <YAxis {...RECESSIVE_AXIS} width={30} allowDecimals={false} domain={niceDomain(values)} />
              <Tooltip
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-gold)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-muted)" }}
                cursor={{ fill: "rgba(212,175,55,.08)" }}
              />
              <Bar dataKey="submissions" fill="var(--gold)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="submissions" content={lastValueLabel(data.length)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
