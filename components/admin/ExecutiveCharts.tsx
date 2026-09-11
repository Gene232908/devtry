"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CHART_GRID_STYLE,
  EmptyChart,
  EXECUTIVE_TOOLTIP_ITEM_STYLE,
  EXECUTIVE_TOOLTIP_LABEL_STYLE,
  EXECUTIVE_TOOLTIP_STYLE,
  isEmptySeries,
  RECESSIVE_AXIS,
} from "@/components/admin/chart-parts";
import type { ExecutiveOverview } from "@/lib/admin/executive-overview";


function Shell({
  title,
  periodLabel,
  badge,
  action,
  children,
}: {
  title: string;
  periodLabel?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5 border-white/10 bg-[#141417]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-fluid-0 text-text tracking-tight">{title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {periodLabel && (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-300 border border-white/10">
              {periodLabel}
            </span>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 1. REVENUE & GROSS PROFIT (Re-exported from modular component)
// ---------------------------------------------------------------------------

export { FinancialTrendChart } from "@/components/admin/FinancialTrendChart";


// ---------------------------------------------------------------------------
// 2. CONVERSION JOURNEY (Progressive Chromatic 8-Stage Funnel)
// ---------------------------------------------------------------------------

const FUNNEL_PALETTE: Record<string, string> = {
  visitors: "#06B6D4",      // Cyan
  submissions: "#3B82F6",   // Blue
  contacted: "#8B5CF6",     // Violet
  inspection_scheduled: "#A855F7", // Purple
  inspected: "#EC4899",     // Pink
  deal: "#F97316",          // Orange
  purchased: "#10B981",     // Emerald
  sold: "#EAB308",          // Amber/Gold
};

export function PipelineFunnelChart({
  data,
  comparisonData,
  periodLabel,
  comparisonPeriodLabel,
  isLoading,
}: {
  data: ExecutiveOverview["pipeline"];
  comparisonData?: ExecutiveOverview["pipeline"];
  periodLabel: string;
  comparisonPeriodLabel?: string;
  isLoading?: boolean;
}) {
  return (
    <Shell title="Lead Journey" periodLabel={periodLabel}>
      {comparisonData ? (
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-300 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-[#3B82F6]" />
            <span>Selected: {periodLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-[#64748B]" />
            <span>Earlier: {comparisonPeriodLabel ?? "Comparison"}</span>
          </div>
        </div>
      ) : (
        <p className="-mt-2 mb-3 text-xs text-gray-300 font-normal">
          See how people move from visiting the website to buying a car.
        </p>
      )}
      <div className="h-[332px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmptySeries(data.map((point) => point.value)) ? (
          <EmptyChart message="No activity in this period" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.map((point) => ({
                ...point,
                comparisonValue: comparisonData?.find((comparison) => comparison.key === point.key)?.value ?? 0,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 70, left: 16, bottom: 0 }}
            >
              <CartesianGrid {...CHART_GRID_STYLE} horizontal={false} vertical={true} />
              <XAxis type="number" {...RECESSIVE_AXIS} allowDecimals={false} />
              <YAxis
                dataKey="label"
                type="category"
                {...RECESSIVE_AXIS}
                width={116}
                tick={{ fill: "#E5E7EB", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={EXECUTIVE_TOOLTIP_STYLE}
                itemStyle={EXECUTIVE_TOOLTIP_ITEM_STYLE}
                labelStyle={EXECUTIVE_TOOLTIP_LABEL_STYLE}
                formatter={(val: unknown, name: unknown) => {
                  const num = Number(val) || 0;
                  return [num, name === "comparisonValue" ? `Earlier: ${comparisonPeriodLabel ?? "Comparison"}` : `Selected: ${periodLabel}`];
                }}
              />
              <Bar dataKey="value" name={`Selected: ${periodLabel}`} maxBarSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {data.map((point) => (
                  <Cell
                    key={point.key}
                    fill={FUNNEL_PALETTE[point.key] ?? "#3B82F6"}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  fill="#E5E7EB"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
              {comparisonData && (
                <Bar
                  dataKey="comparisonValue"
                  name={`Earlier: ${comparisonPeriodLabel ?? "Comparison"}`}
                  fill="#64748B"
                  maxBarSize={20}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="comparisonValue"
                    position="right"
                    fill="#94A3B8"
                    fontSize={11}
                    fontWeight={500}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// 3. INVENTORY AGING (Operational Urgency Palette: Emerald -> Sky -> Amber -> Red)
// ---------------------------------------------------------------------------

const AGING_COLORS = [
  { fill: "#10B981", label: "0-30 days" },   // Fresh
  { fill: "#0EA5E9", label: "31-60 days" },  // Active
  { fill: "#F59E0B", label: "61-90 days" },  // Watch
  { fill: "#EF4444", label: "90+ days" },    // Urgent/Danger
];

export function InventoryAgingChart({
  data,
  comparisonData,
  isLoading,
}: {
  data: ExecutiveOverview["inventoryAging"];
  comparisonData?: ExecutiveOverview["inventoryAging"];
  isLoading?: boolean;
}) {
  const totalStock = data.reduce((acc, point) => acc + (point.count || 0), 0);

  return (
    <Shell title="Time Cars Have Been in Stock" periodLabel="Cars for Sale Now">
      {comparisonData && <p className="-mt-2 mb-2 text-xs text-gray-300">Comparison period: {comparisonData.reduce((total, item) => total + item.count, 0)} cars in stock.</p>}
      <div className="h-56">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmptySeries(data.map((point) => point.count)) ? (
          <EmptyChart message="No cars currently in stock" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={4}
                stroke="#141416"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={AGING_COLORS[index]?.fill ?? "#F59E0B"}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={EXECUTIVE_TOOLTIP_STYLE}
                itemStyle={EXECUTIVE_TOOLTIP_ITEM_STYLE}
                labelStyle={EXECUTIVE_TOOLTIP_LABEL_STYLE}
                formatter={(val: unknown) => [
                  `${Number(val) || 0} car${Number(val) === 1 ? "" : "s"}`,
                  "Quantity",
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={34}
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value: string) => {
                  const found = data.find((d) => d.label === value);
                  return `${value} (${found?.count ?? 0})`;
                }}
              />
              {/* Center counter */}
              <text
                x="50%"
                y="46%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FFFFFF"
                className="font-display font-bold text-base"
              >
                {totalStock}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#9CA3AF"
                className="text-[10px]"
              >
                cars
              </text>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// 4. STAFF PERFORMANCE (Re-exported from modular component)
// ---------------------------------------------------------------------------

export { StaffPerformanceChart } from "@/components/admin/StaffPerformanceChart";
