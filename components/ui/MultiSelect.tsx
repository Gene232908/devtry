"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { label: string; value: string };

type Props = {
  options: MultiSelectOption[];
  /** Selected values. EMPTY MEANS "ALL" — see the note on `allLabel`. */
  selected: string[];
  onChange: (next: string[]) => void;
  /**
   * Shown on the closed control when nothing is ticked.
   *
   * An empty selection deliberately means "no filter", not "match nothing".
   * Filtering to zero rows is never what someone wants from an untouched
   * control, and it keeps the default identical to the single-select this
   * replaced — clearing every box returns the full list rather than an empty
   * table with no obvious way back.
   */
  allLabel: string;
  /** Plural noun for the summary, e.g. "statuses" -> "3 statuses". */
  noun: string;
  className?: string;
  /** Enables an inline search filter inside the dropdown menu. */
  searchable?: boolean;
};

/**
 * A dropdown whose options are checkboxes, so several can be active at once.
 *
 * Built on real `<input type="checkbox">` elements inside `<label>`s rather
 * than an ARIA listbox. That hands over keyboard interaction, focus order and
 * screen-reader announcement to the browser instead of reimplementing them,
 * which is where hand-rolled multi-selects usually break.
 */
export function MultiSelect({ options, selected, onChange, allLabel, noun, className, searchable }: Props) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const summary = useMemo(() => {
    if (selected.length === 0) return allLabel;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label ?? allLabel;
    }
    return `${selected.length} ${noun}`;
  }, [selected, options, allLabel, noun]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, searchable, searchQuery]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const hasSelection = selected.length > 0;

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-card border bg-surface-2 px-3 text-fluid--1 outline-none transition-colors",
          hasSelection ? "border-gold/50 text-gold" : "border-border text-text",
          open && "border-gold",
        )}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {hasSelection && (
            // A reset that does not require opening the panel and unticking
            // boxes one at a time. It is a <span> rather than a nested <button>
            // because a button inside a button is invalid HTML and browsers
            // resolve it in ways that break the click target.
            <span
              role="button"
              tabIndex={0}
              aria-label={`Clear ${noun} filter`}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="rounded p-0.5 text-text-muted transition-colors hover:text-gold"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180 text-gold")} />
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="group"
          aria-label={allLabel}
          className="absolute z-30 mt-1.5 max-h-72 w-full min-w-[13rem] overflow-auto rounded-card border border-border-gold/80 bg-surface-2 py-1 shadow-[0_18px_42px_-18px_rgba(0,0,0,.9)] animate-fade-in"
        >
          {searchable && options.length > 5 && (
            <div
              className="sticky top-0 z-10 border-b border-border/80 bg-surface-2 px-2.5 py-1.5 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${noun}…`}
                  className="h-8 w-full rounded border border-border bg-bg pl-8 pr-7 text-xs text-text placeholder:text-text-faint outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
                    aria-label="Clear filter search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-b border-border px-3 pb-1.5 pt-1">
            <span className="text-fluid--1 text-text-faint">
              {hasSelection ? `${selected.length} selected` : allLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                if (hasSelection) {
                  onChange([]);
                } else {
                  const toSelect = filteredOptions.length > 0 ? filteredOptions.map((o) => o.value) : options.map((o) => o.value);
                  onChange(toSelect);
                }
              }}
              className="text-fluid--1 text-text-muted transition-colors hover:text-gold"
            >
              {hasSelection ? "Clear" : "Select all"}
            </button>
          </div>

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-text-faint">
              No matching {noun}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-fluid--1 transition-colors",
                    checked ? "text-gold" : "text-text hover:bg-surface",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    // Visually replaced by the box below, but still the real
                    // control: it keeps Tab, Space, and screen-reader state.
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold/60",
                      checked ? "border-gold bg-gold/20" : "border-border bg-bg/40",
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-gold" />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
