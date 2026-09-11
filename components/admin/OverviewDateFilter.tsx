"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { buildLastSevenUaeDays, uaeDayKey } from "@/lib/uae-time";

export type DateFilterValue = {
  preset: "week" | "today" | "month" | "last_month" | "all" | "custom";
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  label: string;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function getDaysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function formatDateDisplay(dayStr?: string): string {
  if (!dayStr) return "";
  const [y, m, d] = dayStr.split("-").map(Number);
  const monthName = MONTH_NAMES[m - 1]?.slice(0, 3) ?? "";
  return `${pad(d)} ${monthName} ${y}`;
}

type Props = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  isLoading?: boolean;
};

export function OverviewDateFilter({ value, onChange, isLoading }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // UAE anchor date
  const nowUae = useMemo(() => {
    const uaeStr = uaeDayKey(new Date());
    const [y, m, d] = uaeStr.split("-").map(Number);
    return { year: y, month: m, day: d, dateStr: uaeStr };
  }, []);

  // Calendar navigation state (which month/year is being viewed in calendar)
  const [viewYear, setViewYear] = useState<number>(nowUae.year);
  const [viewMonth, setViewMonth] = useState<number>(nowUae.month); // 1-12

  // Interactive selection state
  const [rangeStart, setRangeStart] = useState<string | null>(value.from ?? null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(value.to ?? null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Close popover on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", onMouseDown);
    }
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [isOpen]);

  // Synchronize calendar view when popover opens
  useEffect(() => {
    if (isOpen) {
      if (value.from) {
        const [y, m] = value.from.split("-").map(Number);
        setViewYear(y);
        setViewMonth(m);
        setRangeStart(value.from);
        setRangeEnd(value.to ?? value.from);
      } else {
        setViewYear(nowUae.year);
        setViewMonth(nowUae.month);
        setRangeStart(null);
        setRangeEnd(null);
      }
    }
  }, [isOpen, value.from, value.to, nowUae.year, nowUae.month]);

  // Available selectable years: 2024 to current year + 1
  const availableYears = useMemo(() => {
    const years: number[] = [];
    const minYear = 2024;
    const maxYear = Math.max(nowUae.year, 2026);
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [nowUae.year]);

  // Quick Presets
  function applyPreset(preset: DateFilterValue["preset"]) {
    setIsOpen(false);
    if (preset === "week") {
      const days = buildLastSevenUaeDays();
      onChange({
        preset: "week",
        from: days[0].key,
        to: days[days.length - 1].key,
        label: "This Week",
      });
      return;
    }

    if (preset === "today") {
      onChange({
        preset: "today",
        from: nowUae.dateStr,
        to: nowUae.dateStr,
        label: "Today",
      });
      return;
    }

    if (preset === "month") {
      const days = getDaysInMonth(nowUae.year, nowUae.month);
      const from = `${nowUae.year}-${pad(nowUae.month)}-01`;
      const to = `${nowUae.year}-${pad(nowUae.month)}-${pad(days)}`;
      onChange({
        preset: "month",
        from,
        to,
        label: `${MONTH_NAMES[nowUae.month - 1]} ${nowUae.year}`,
      });
      return;
    }

    if (preset === "last_month") {
      const lmYear = nowUae.month === 1 ? nowUae.year - 1 : nowUae.year;
      const lmMonth = nowUae.month === 1 ? 12 : nowUae.month - 1;
      const days = getDaysInMonth(lmYear, lmMonth);
      const from = `${lmYear}-${pad(lmMonth)}-01`;
      const to = `${lmYear}-${pad(lmMonth)}-${pad(days)}`;
      onChange({
        preset: "last_month",
        from,
        to,
        label: `${MONTH_NAMES[lmMonth - 1]} ${lmYear}`,
      });
      return;
    }

    if (preset === "all") {
      onChange({
        preset: "all",
        from: "2024-01-01",
        to: `${nowUae.year}-12-31`,
        label: "All Time",
      });
      return;
    }
  }

  // Quick Week within viewed month
  function applyMonthWeekShortcut(weekIndex: 1 | 2 | 3 | 4 | 5 | "all") {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const mName = MONTH_NAMES[viewMonth - 1];

    let startD = 1;
    let endD = daysInMonth;

    if (weekIndex === 1) {
      startD = 1;
      endD = Math.min(7, daysInMonth);
    } else if (weekIndex === 2) {
      startD = 8;
      endD = Math.min(14, daysInMonth);
    } else if (weekIndex === 3) {
      startD = 15;
      endD = Math.min(21, daysInMonth);
    } else if (weekIndex === 4) {
      startD = 22;
      endD = Math.min(28, daysInMonth);
    } else if (weekIndex === 5) {
      startD = 29;
      endD = daysInMonth;
    }

    const from = `${viewYear}-${pad(viewMonth)}-${pad(startD)}`;
    const to = `${viewYear}-${pad(viewMonth)}-${pad(endD)}`;
    const label =
      weekIndex === "all"
        ? `${mName} ${viewYear} (Full Month)`
        : `${mName} ${viewYear} (Days ${startD}–${endD})`;

    setRangeStart(from);
    setRangeEnd(to);
    onChange({
      preset: "custom",
      from,
      to,
      label,
    });
    setIsOpen(false);
  }

  // Calendar Day Click Handler
  function handleDayClick(dayStr: string) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // First click: start new range
      setRangeStart(dayStr);
      setRangeEnd(null);
    } else {
      // Second click: complete range
      let s = rangeStart;
      let e = dayStr;
      if (s > e) {
        s = dayStr;
        e = rangeStart;
      }
      setRangeStart(s);
      setRangeEnd(e);
    }
  }

  // Confirm custom range
  function applyCustomRange() {
    if (!rangeStart) return;
    const s = rangeStart;
    const e = rangeEnd ?? rangeStart;
    const finalStart = s <= e ? s : e;
    const finalEnd = s <= e ? e : s;

    const [sy, sm, sd] = finalStart.split("-").map(Number);
    const [ey, em, ed] = finalEnd.split("-").map(Number);

    let label = `${formatDateDisplay(finalStart)} – ${formatDateDisplay(finalEnd)}`;
    if (finalStart === finalEnd) {
      label = formatDateDisplay(finalStart);
    } else if (sy === ey && sm === em) {
      label = `${MONTH_NAMES[sm - 1]} ${sy} (Days ${sd}–${ed})`;
    }

    onChange({
      preset: "custom",
      from: finalStart,
      to: finalEnd,
      label,
    });
    setIsOpen(false);
  }

  // Navigation arrows
  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Build Calendar Matrix
  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDayUtc = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();

    const cells: Array<{
      dayStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }> = [];

    // Leading days from previous month
    const prevMonthDays =
      viewMonth === 1 ? getDaysInMonth(viewYear - 1, 12) : getDaysInMonth(viewYear, viewMonth - 1);
    for (let i = firstDayUtc - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const pm = viewMonth === 1 ? 12 : viewMonth - 1;
      const py = viewMonth === 1 ? viewYear - 1 : viewYear;
      cells.push({
        dayStr: `${py}-${pad(pm)}-${pad(dNum)}`,
        dayNumber: dNum,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dayStr: `${viewYear}-${pad(viewMonth)}-${pad(d)}`,
        dayNumber: d,
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to fill grid to multiple of 7
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nm = viewMonth === 12 ? 1 : viewMonth + 1;
      const ny = viewMonth === 12 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          dayStr: `${ny}-${pad(nm)}-${pad(d)}`,
          dayNumber: d,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Determine active selection highlighting
  const activeEffectiveStart = rangeStart;
  const activeEffectiveEnd = rangeEnd ?? (hoverDate && rangeStart ? hoverDate : null);
  const normalizedStart =
    activeEffectiveStart && activeEffectiveEnd
      ? activeEffectiveStart <= activeEffectiveEnd
        ? activeEffectiveStart
        : activeEffectiveEnd
      : activeEffectiveStart;
  const normalizedEnd =
    activeEffectiveStart && activeEffectiveEnd
      ? activeEffectiveStart <= activeEffectiveEnd
        ? activeEffectiveEnd
        : activeEffectiveStart
      : activeEffectiveStart;

  const isLiveWeek = value.preset === "week";

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Sleek Primary Date Filter Control Bar */}
      <Card className="p-3 border-border-gold/40 bg-surface/95 backdrop-blur-sm shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Prominent Interactive Date Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="overview-date-filter-trigger"
            disabled={isLoading}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 rounded-lg font-medium border transition-all cursor-pointer select-none",
              isOpen || !isLiveWeek
                ? "border-gold bg-surface-2 text-gold shadow-[0_0_15px_rgba(212,175,55,0.22)] ring-1 ring-gold/40"
                : "border-border-gold/50 bg-surface-2/90 text-text hover:border-gold/70 hover:bg-surface-2",
            )}
          >
            <CalendarIcon className="h-4 w-4 text-gold shrink-0" />
            <div className="flex items-center gap-2 text-left">
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                Date Filter:
              </span>
              <span className="font-bold text-text text-fluid--1">
                {value.label}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gold shrink-0 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </button>

          {/* Quick Reset button when backlog/historical filter is engaged */}
          {!isLiveWeek && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("week")}
              className="h-9 px-3 text-fluid--1 text-text-muted hover:text-text gap-1.5 border-border-gold/40 hover:border-gold/60"
              title="Reset to Live Week"
            >
              <RotateCcw className="h-3.5 w-3.5 text-gold" />
              <span>Reset to Live Week</span>
            </Button>
          )}
        </div>

        {/* Right: Informational Timezone & Status Pill */}
        <div className="flex items-center gap-3 text-fluid--1 text-text-faint ml-auto">
          {!isLiveWeek ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gold/15 text-gold border border-gold/30">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Historical Backlog
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success/15 text-success border border-success/30">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live Week
            </span>
          )}
          <span className="hidden sm:inline-block text-[11px] text-text-muted font-medium">
            UAE Time (UTC+4)
          </span>
        </div>
      </Card>

      {/* Fully Opaque, Ultra-Crisp Calendar & Backlog Popover Modal */}
      {isOpen && (
        <div
          id="overview-date-filter-popover"
          className="absolute left-0 top-full mt-2 z-50 w-full sm:w-[620px] max-w-[calc(100vw-2rem)] bg-[#141416] border border-border-gold/70 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-4 sm:p-5 flex flex-col gap-4 animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gold" />
              <span className="font-semibold text-text text-fluid-0">
                Select Date Range & Backlog
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Left Sidebar: Quick Presets & Backtrack Weeks */}
            <div className="w-full sm:w-[185px] flex flex-col gap-3 border-b sm:border-b-0 sm:border-r border-border/60 pb-3 sm:pb-0 sm:pr-3 shrink-0">
              {/* Presets */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-text-faint font-semibold mb-0.5">
                  Standard Presets
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset("week")}
                  className={cn(
                    "text-left px-2.5 py-1.5 rounded text-fluid--1 font-medium transition-colors flex items-center justify-between cursor-pointer",
                    value.preset === "week"
                      ? "bg-gold text-black font-semibold"
                      : "text-text hover:bg-surface-2 hover:text-gold",
                  )}
                >
                  <span>This Week (Live)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("today")}
                  className={cn(
                    "text-left px-2.5 py-1.5 rounded text-fluid--1 font-medium transition-colors flex items-center justify-between cursor-pointer",
                    value.preset === "today"
                      ? "bg-gold text-black font-semibold"
                      : "text-text hover:bg-surface-2 hover:text-gold",
                  )}
                >
                  <span>Today</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("month")}
                  className={cn(
                    "text-left px-2.5 py-1.5 rounded text-fluid--1 font-medium transition-colors flex items-center justify-between cursor-pointer",
                    value.preset === "month"
                      ? "bg-gold text-black font-semibold"
                      : "text-text hover:bg-surface-2 hover:text-gold",
                  )}
                >
                  <span>This Month</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last_month")}
                  className={cn(
                    "text-left px-2.5 py-1.5 rounded text-fluid--1 font-medium transition-colors flex items-center justify-between cursor-pointer",
                    value.preset === "last_month"
                      ? "bg-gold text-black font-semibold"
                      : "text-text hover:bg-surface-2 hover:text-gold",
                  )}
                >
                  <span>Last Month</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("all")}
                  className={cn(
                    "text-left px-2.5 py-1.5 rounded text-fluid--1 font-medium transition-colors flex items-center justify-between cursor-pointer",
                    value.preset === "all"
                      ? "bg-gold text-black font-semibold"
                      : "text-text hover:bg-surface-2 hover:text-gold",
                  )}
                >
                  <span>All Time</span>
                </button>
              </div>

              {/* Month Weeks Shortcuts */}
              <div className="flex flex-col gap-1 border-t border-border/50 pt-2.5">
                <span className="text-[10px] uppercase tracking-wider text-text-faint font-semibold mb-0.5">
                  Backlog ({MONTH_NAMES[viewMonth - 1]?.slice(0, 3)} {viewYear})
                </span>
                <button
                  type="button"
                  onClick={() => applyMonthWeekShortcut(1)}
                  className="text-left px-2.5 py-1 rounded text-fluid--1 text-text hover:bg-surface-2 hover:text-gold transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Week 1 (Days 1–7)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyMonthWeekShortcut(2)}
                  className="text-left px-2.5 py-1 rounded text-fluid--1 text-text hover:bg-surface-2 hover:text-gold transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Week 2 (Days 8–14)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyMonthWeekShortcut(3)}
                  className="text-left px-2.5 py-1 rounded text-fluid--1 text-text hover:bg-surface-2 hover:text-gold transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Week 3 (Days 15–21)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyMonthWeekShortcut(4)}
                  className="text-left px-2.5 py-1 rounded text-fluid--1 text-text hover:bg-surface-2 hover:text-gold transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Week 4 (Days 22–28)</span>
                </button>
                {getDaysInMonth(viewYear, viewMonth) > 28 && (
                  <button
                    type="button"
                    onClick={() => applyMonthWeekShortcut(5)}
                    className="text-left px-2.5 py-1 rounded text-fluid--1 text-text hover:bg-surface-2 hover:text-gold transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Week 5 (Days 29–end)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => applyMonthWeekShortcut("all")}
                  className="text-left px-2.5 py-1 rounded text-fluid--1 text-gold font-medium hover:bg-surface-2 transition-colors flex items-center justify-between cursor-pointer mt-0.5"
                >
                  <span>Entire Month</span>
                </button>
              </div>
            </div>

            {/* Right Panel: Interactive Visual Calendar Grid */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Calendar Month & Year Selector Header */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-md flex items-center justify-center bg-surface-2 hover:bg-surface border border-border/50 text-text-muted hover:text-text transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={viewMonth}
                    onChange={(e) => setViewMonth(Number(e.target.value))}
                    className="h-8 px-2.5 rounded-md bg-surface-2 border border-border-gold/40 text-fluid--1 text-text font-semibold focus:border-gold outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((mName, idx) => (
                      <option key={mName} value={idx + 1} className="bg-[#141416] text-text">
                        {mName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(Number(e.target.value))}
                    className="h-8 px-2.5 rounded-md bg-surface-2 border border-border-gold/40 text-fluid--1 text-text font-semibold focus:border-gold outline-none cursor-pointer"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr} className="bg-[#141416] text-text">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-md flex items-center justify-center bg-surface-2 hover:bg-surface border border-border/50 text-text-muted hover:text-text transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day Headers (Su, Mo, Tu, We, Th, Fr, Sa) */}
              <div className="grid grid-cols-7 text-center">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="text-[11px] font-semibold text-text-muted py-1">
                    {w}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {calendarCells.map(({ dayStr, dayNumber, isCurrentMonth }) => {
                  const isStart = rangeStart === dayStr;
                  const isEnd = (rangeEnd ?? rangeStart) === dayStr;
                  const inRange =
                    normalizedStart &&
                    normalizedEnd &&
                    dayStr >= normalizedStart &&
                    dayStr <= normalizedEnd;

                  return (
                    <div
                      key={dayStr}
                      className={cn(
                        "relative flex items-center justify-center py-0.5",
                        inRange && "bg-gold/15",
                        isStart && normalizedEnd && normalizedStart !== normalizedEnd && "rounded-l-full",
                        isEnd && normalizedStart && normalizedStart !== normalizedEnd && "rounded-r-full",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleDayClick(dayStr)}
                        onMouseEnter={() => {
                          if (rangeStart && !rangeEnd) {
                            setHoverDate(dayStr);
                          }
                        }}
                        className={cn(
                          "h-8 w-8 rounded-full text-fluid--1 font-medium transition-all flex items-center justify-center cursor-pointer",
                          !isCurrentMonth && "text-text-faint/30 hover:text-text-faint",
                          isCurrentMonth && !inRange && "text-text hover:bg-surface-2 hover:text-gold",
                          inRange && !isStart && !isEnd && "text-gold font-semibold",
                          (isStart || isEnd) &&
                            "bg-gold text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.6)] z-10",
                        )}
                      >
                        {dayNumber}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer: Selected Range Summary + Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-fluid--1 text-text-muted">
              <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
              <span>
                {rangeStart ? (
                  <>
                    <strong className="text-gold">{formatDateDisplay(rangeStart)}</strong>
                    {rangeEnd && rangeEnd !== rangeStart && (
                      <>
                        {" "}
                        → <strong className="text-gold">{formatDateDisplay(rangeEnd)}</strong>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-text-faint">Click a start day, then an end day</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 text-fluid--1 text-text-muted hover:text-text border-border/60"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!rangeStart}
                onClick={applyCustomRange}
                className="h-8 text-fluid--1 font-semibold"
              >
                Apply Range
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
