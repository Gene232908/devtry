"use client";

import { useMemo, useState } from "react";
import { CalendarRange, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { previousMatchingPeriod, type OverviewRange } from "@/lib/admin/executive-overview";

type Props = {
  primaryRange: OverviewRange;
  value?: OverviewRange;
  onChange: (range?: OverviewRange) => void;
  disabled?: boolean;
};

function addDays(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function rangeDays(range: OverviewRange) {
  return Math.floor((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000) + 1;
}

function previousYear(range: OverviewRange): OverviewRange {
  const shift = (day: string) => {
    const value = new Date(`${day}T00:00:00Z`);
    value.setUTCFullYear(value.getUTCFullYear() - 1);
    return value.toISOString().slice(0, 10);
  };
  return { from: shift(range.from), to: shift(range.to) };
}

function friendlyRange(range: OverviewRange) {
  const format = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return range.from === range.to
    ? format.format(new Date(`${range.from}T00:00:00Z`))
    : `${format.format(new Date(`${range.from}T00:00:00Z`))} - ${format.format(new Date(`${range.to}T00:00:00Z`))}`;
}

/** Simple first, custom only when it is genuinely needed. */
export function OverviewComparisonFilter({ primaryRange, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const days = rangeDays(primaryRange);
  const previous = useMemo(() => previousMatchingPeriod(primaryRange), [primaryRange]);
  const yearAgo = useMemo(() => previousYear(primaryRange), [primaryRange]);
  const latestCustomStart = useMemo(() => addDays(primaryRange.from, -days), [days, primaryRange.from]);
  const customRange = useMemo<OverviewRange | null>(() => {
    if (!customFrom || Number.isNaN(Date.parse(`${customFrom}T00:00:00Z`))) return null;
    return { from: customFrom, to: addDays(customFrom, days - 1) };
  }, [customFrom, days]);

  function choose(range?: OverviewRange) {
    onChange(range);
    setOpen(false);
    setShowCustom(false);
  }

  function openMenu() {
    setOpen((wasOpen) => !wasOpen);
    setShowCustom(false);
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={openMenu}
        className={cn(
          "transition-all duration-200",
          value ? "border-amber-400/40 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25" : "",
        )}
      >
        <CalendarRange className="h-4 w-4" />
        {value ? "Comparison on" : "Compare: Off"}
      </Button>

      {open && (
        <Card className="absolute right-0 z-40 mt-2 w-[min(25rem,calc(100vw-2rem))] p-4 shadow-2xl border-white/15 bg-[#16161a] backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Compare this period</p>
              <p className="text-xs text-[#a39c90]">Pick one simple option. We only compare periods with the same number of days.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-[#a39c90] hover:bg-white/10 hover:text-white" aria-label="Close comparison">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!showCustom ? (
            <div className="space-y-2">
              <ChoiceButton
                title="Previous period"
                detail={`Compare ${friendlyRange(primaryRange)} with ${friendlyRange(previous)}.`}
                onClick={() => choose(previous)}
              />
              <ChoiceButton
                title="Same time last year"
                detail={`Compare ${friendlyRange(primaryRange)} with ${friendlyRange(yearAgo)}.`}
                onClick={() => choose(yearAgo)}
              />
              <button
                type="button"
                onClick={() => {
                  setCustomFrom(previous.from);
                  setShowCustom(true);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-[#c8c2b8] transition-colors hover:bg-white/5 hover:text-white"
              >
                Choose another earlier period
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <button type="button" onClick={() => setShowCustom(false)} className="mb-3 text-xs text-amber-300 hover:text-amber-200">
                Back to simple choices
              </button>
              <label className="block text-xs font-medium text-[#a39c90]">
                First day of the earlier period
                <input
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  type="date"
                  max={latestCustomStart}
                  className="mt-1 block w-full rounded-lg border border-white/15 bg-[#1f1f26] p-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </label>
              {customRange && (
                <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  You will compare: <strong>{friendlyRange(customRange)}</strong> ({days} {days === 1 ? "day" : "days"}).
                </p>
              )}
              <Button size="sm" disabled={!customRange} onClick={() => customRange && choose(customRange)} className="mt-3 w-full bg-amber-500 text-xs font-semibold text-black hover:bg-amber-400">
                Compare periods
              </Button>
            </div>
          )}

          {value && (
            <button type="button" onClick={() => choose(undefined)} className="mt-3 w-full border-t border-white/10 pt-3 text-xs text-[#a39c90] hover:text-white">
              Turn comparison off
            </button>
          )}
        </Card>
      )}
    </div>
  );
}

function ChoiceButton({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-amber-400/40 hover:bg-amber-400/10">
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-[#a39c90]">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-amber-300" />
    </button>
  );
}
