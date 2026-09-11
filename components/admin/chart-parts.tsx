"use client";

import React from "react";
import { Card } from "@/components/ui/Card";

export function ChartShell({
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

/**
 * Shared pieces for the Overview charts, so they stay readable in the same
 * way rather than drifting apart.
 */

/**
 * Axis styling: present, but quiet.
 *
 * The data is the subject; the axis is scaffolding. No tick marks, no axis line,
 * muted ink, and `allowDecimals={false}` because a count of people or
 * submissions is never 2.5 — without it recharts invents fractional ticks on
 * small ranges, which reads as precision that does not exist.
 */
export const RECESSIVE_AXIS = {
  stroke: "#9CA3AF",
  tick: { fill: "#D1D5DB", fontSize: 11 },
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};

/** Keeps the newest day clear of the right edge and leaves room for its label. */
export const CHART_MARGIN = { top: 16, right: 14, left: 0, bottom: 0 };

/**
 * A y-axis that ends just above the tallest bar, with whole-number ticks.
 *
 * Left to itself recharts padded a two-visitor week out to a 0–4 axis, so the
 * data sat in the bottom half of the card and the two busiest days looked
 * unremarkable. Ending at `max + 1` keeps the shape legible at small counts —
 * which is every count, early on — while leaving headroom so the top point is
 * never flush against the frame.
 *
 * The floor of 4 stops a single-visit day from being drawn as a full-height
 * cliff, which reads as a spike rather than as one person.
 */
export function niceDomain(values: number[]): [number, number] {
  const max = Math.max(0, ...values);
  return [0, Math.max(4, max + 1)];
}

/** True when there is nothing to plot — every day in the window is zero. */
export function isEmptySeries(values: number[]): boolean {
  return values.every((v) => !v);
}

/**
 * Deliberately wider than what is used. Recharts types a label's `value` as
 * `RenderableText`, which admits null and arrays, so narrowing it here would
 * make the component un-assignable to `LabelList`'s `content` prop. It is
 * narrowed at the point of use instead.
 */
type LabelProps = {
  x?: number | string;
  y?: number | string;
  value?: unknown;
  index?: number;
};

/**
 * Prints the value for the LAST point only.
 *
 * A number on every point turns a chart back into a table and buries the trend
 * it exists to show. The most recent day is the one that answers "how are we
 * doing right now", so that is the one worth stating outright; the rest are
 * read from the axis, or hovered.
 *
 * Rendered in muted text ink rather than the series colour — the mark already
 * carries the identity, and a gold number would compete with it.
 */
export function lastValueLabel(pointCount: number) {
  function LastValueLabel({ x, y, value, index }: LabelProps) {
    if (index !== pointCount - 1) return null;
    if (typeof value !== "number" && typeof value !== "string") return null;

    return (
      <text
        x={Number(x)}
        y={Number(y) - 8}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={12}
        fontWeight={500}
      >
        {value}
      </text>
    );
  }

  return LastValueLabel;
}

export const EXECUTIVE_TOOLTIP_STYLE = {
  background: "rgba(18, 18, 22, 0.95)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 10,
  boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.75)",
  padding: "10px 14px",
  color: "#FFFFFF",
};

export const EXECUTIVE_TOOLTIP_ITEM_STYLE = {
  color: "#F3F4F6",
  fontSize: "12px",
  fontWeight: 500,
  padding: "2px 0",
};

export const EXECUTIVE_TOOLTIP_LABEL_STYLE = {
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "13px",
  marginBottom: "4px",
};

/** A plain-language tooltip for charts that pair equal-length date ranges. */
export function ComparisonDayTooltip({
  active,
  payload,
  selectedLabel,
  comparisonLabel,
  selectedValueKey,
  comparisonValueKey,
  valueLabel,
  selectedTone = "cyan",
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
  selectedLabel: string;
  comparisonLabel?: string;
  selectedValueKey: string;
  comparisonValueKey: string;
  valueLabel: string;
  selectedTone?: "cyan" | "amber";
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const selectedValue = Number(point[selectedValueKey] ?? 0);
  const comparisonValue = Number(point[comparisonValueKey] ?? 0);
  const selectedDay = String(point.day ?? "Selected day");
  const comparisonDay = point.comparisonDay ? String(point.comparisonDay) : undefined;
  const selectedToneClass = selectedTone === "amber"
    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
    : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

  return (
    <div className="min-w-[220px] rounded-xl border border-white/15 bg-[#121216]/95 p-3 text-xs text-gray-200 shadow-2xl backdrop-blur-xl">
      <p className="font-semibold text-white">{selectedDay}</p>
      {comparisonDay && comparisonLabel && (
        <p className="mt-1 text-[11px] leading-snug text-gray-400">
          This day is compared with <span className="font-semibold text-slate-200">{comparisonDay}</span> from the earlier period.
        </p>
      )}
      <div className="mt-3 grid gap-2">
        <div className={`rounded-lg border px-2.5 py-2 ${selectedToneClass}`}>
          <p className="font-medium">Selected: {selectedLabel}</p>
          <p className="mt-0.5 font-semibold text-white">{selectedValue.toLocaleString("en-AE")} {valueLabel}</p>
        </div>
        {comparisonLabel && (
          <div className="rounded-lg border border-slate-400/20 bg-slate-400/10 px-2.5 py-2">
            <p className="font-medium text-slate-300">Earlier: {comparisonLabel}</p>
            <p className="mt-0.5 font-semibold text-white">{comparisonValue.toLocaleString("en-AE")} {valueLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const CHART_GRID_STYLE = {
  stroke: "rgba(255, 255, 255, 0.05)",
  strokeDasharray: "3 3",
  vertical: false as const,
};

export function niceCurrencyDomain(values: number[]): [number, number] {
  const max = Math.max(0, ...values);
  if (max === 0) return [0, 1000];
  const padding = max * 0.15;
  return [0, Math.ceil((max + padding) / 100) * 100];
}

/**
 * Shown instead of the plot when every day is zero.
 *
 * A flat line pinned to the baseline, with a full y-axis beside it, looks like
 * a chart that is broken rather than a week in which nothing happened — and it
 * is indistinguishable from the genuinely broken case. Saying so in words
 * removes the ambiguity.
 */
export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="text-fluid--1 text-text-muted">{message}</p>
      <p className="text-fluid--1 text-text-faint">Nothing recorded in the selected period.</p>
    </div>
  );
}
