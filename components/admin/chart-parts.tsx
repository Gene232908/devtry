"use client";

/**
 * Shared pieces for the two Overview charts, so they stay readable in the same
 * way rather than drifting apart.
 *
 * Both charts previously ran with `<YAxis hide />` and `margin.right = 0`. That
 * combination meant the figures were readable ONLY by hovering — the chart
 * showed a shape with no scale — and the newest day, the one people look at
 * first, sat exactly on the right edge where its mark was clipped in half.
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
  stroke: "var(--text-faint)",
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
      <p className="text-fluid--1 text-text-faint">Nothing recorded in the last 7 days.</p>
    </div>
  );
}
