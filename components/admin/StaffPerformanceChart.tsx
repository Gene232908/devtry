"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CHART_GRID_STYLE,
  CHART_MARGIN,
  ChartShell,
  EmptyChart,
  EXECUTIVE_TOOLTIP_ITEM_STYLE,
  EXECUTIVE_TOOLTIP_LABEL_STYLE,
  EXECUTIVE_TOOLTIP_STYLE,
  isEmptySeries,
  RECESSIVE_AXIS,
} from "@/components/admin/chart-parts";
import type { ExecutiveOverview } from "@/lib/admin/executive-overview";

export function StaffPerformanceChart({
  data,
  comparisonData,
  periodLabel,
  isLoading,
}: {
  data: ExecutiveOverview["staff"];
  comparisonData?: ExecutiveOverview["staff"];
  periodLabel: string;
  isLoading?: boolean;
}) {
  const [roleFilter, setRoleFilter] = useState<"all" | "call_center" | "purchaser">("all");

  const filteredStaff = useMemo(() => {
    if (roleFilter === "all") return data;
    return data.filter((staff) => staff.role === roleFilter);
  }, [data, roleFilter]);

  const chartData = filteredStaff.map((staff) => ({
    name: staff.name,
    assigned: staff.assigned,
    handled: staff.handled,
    deals: staff.deals,
    role: staff.role,
  }));

  const agentCount = data.filter((s) => s.role === "call_center").length;
  const purchaserCount = data.filter((s) => s.role === "purchaser").length;

  const roleSelector = (
    <div className="flex items-center gap-1.5">
      <label htmlFor="staff-role-filter" className="sr-only">
        Filter by Role
      </label>
      <select
        id="staff-role-filter"
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value as "all" | "call_center" | "purchaser")}
        className="h-7 rounded-md border border-white/15 bg-[#1a1a20] px-2.5 text-xs font-semibold text-gray-200 shadow-sm focus:border-white/40 focus:outline-none cursor-pointer transition-colors"
      >
        <option value="all" className="bg-[#141418] text-white">
          All Roles ({data.length})
        </option>
        <option value="call_center" className="bg-[#141418] text-white">
          Agents Only ({agentCount})
        </option>
        <option value="purchaser" className="bg-[#141418] text-white">
          Purchasers Only ({purchaserCount})
        </option>
      </select>
    </div>
  );

  return (
    <ChartShell title="Staff Performance" periodLabel={periodLabel} action={roleSelector}>
      <p className="-mt-2 mb-3 text-xs text-[#a39c90] font-normal">
        {roleFilter === "call_center"
          ? "Showing Call Center Agents only."
          : roleFilter === "purchaser"
            ? "Showing Purchasers only."
            : "Assigned leads created during this period and handled through deal closure."}
      </p>
      {comparisonData && <p className="-mt-1 mb-3 text-xs text-slate-300">Comparison period: {comparisonData.reduce((total, member) => total + member.assigned, 0)} assigned · {comparisonData.reduce((total, member) => total + member.handled, 0)} handled · {comparisonData.reduce((total, member) => total + member.deals, 0)} deals.</p>}
      <div className="h-64">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : filteredStaff.length === 0 ? (
          <EmptyChart
            message={
              roleFilter === "call_center"
                ? "No Call Center Agents found"
                : "No Purchasers found"
            }
          />
        ) : isEmptySeries(
            chartData.flatMap((point) => [point.assigned, point.handled, point.deals]),
          ) ? (
          <EmptyChart message="No assigned-lead activity in this period" />
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="name" {...RECESSIVE_AXIS} tick={{ fill: "#E5E7EB", fontSize: 11 }} />
              <YAxis {...RECESSIVE_AXIS} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={EXECUTIVE_TOOLTIP_STYLE}
                itemStyle={EXECUTIVE_TOOLTIP_ITEM_STYLE}
                labelStyle={EXECUTIVE_TOOLTIP_LABEL_STYLE}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingBottom: "6px", color: "#E5E7EB" }}
              />
              <Bar
                dataKey="assigned"
                name="Assigned"
                fill="#6366F1"
                maxBarSize={22}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="handled"
                name="Handled"
                fill="#F59E0B"
                maxBarSize={22}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="deals"
                name="Deals"
                fill="#10B981"
                maxBarSize={22}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartShell>
  );
}
