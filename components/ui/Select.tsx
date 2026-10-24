"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
  /**
   * Optional explanation, revealed under the label on hover/focus. Use it when
   * an option's name alone does not make its meaning obvious — it keeps the
   * closed control uncluttered while still letting the field explain itself.
   */
  hint?: string;
  /**
   * Optional secondary context (e.g. brand / make name) shown on the right side.
   */
  description?: string;
};

type SelectProps = {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  name?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
};

export function Select({
  label,
  placeholder = "Select",
  options,
  value,
  onChange,
  disabled,
  error,
  name,
  searchable,
  searchPlaceholder = "Search...",
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  // Auto-enable search bar for large lists unless explicitly turned off
  const isSearchable = searchable ?? options.length >= 7;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (open && isSearchable) {
      setQuery("");
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (!open) {
      setQuery("");
    }
  }, [open, isSearchable]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchHint = opt.hint ? opt.hint.toLowerCase().includes(q) : false;
      const matchDesc = opt.description ? opt.description.toLowerCase().includes(q) : false;
      return matchLabel || matchHint || matchDesc;
    });
  }, [options, query]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={rootRef}>
      {label && <span className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">{label}</span>}
      <div className="relative">
        <button
          type="button"
          name={name}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-3 rounded-card border border-border-gold/45 bg-bg/45 px-4 text-fluid-0 text-text outline-none transition-all duration-150",
            open && "border-gold bg-surface-2/80 shadow-[0_0_0_3px_rgba(212,175,55,.16)]",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-danger",
          )}
        >
          <span className={cn("truncate", !selected && "text-text-faint")}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform duration-150", open && "rotate-180 text-gold")} />
        </button>
        {open && (
          <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-card border border-border-gold/80 bg-surface-2 shadow-[0_18px_42px_-18px_rgba(0,0,0,.9)] animate-fade-in">
            {isSearchable && (
              <div className="border-b border-border-gold/30 bg-surface-2 p-2">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-text-faint" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Escape") {
                        setOpen(false);
                      } else if (e.key === "Enter" && filteredOptions.length > 0) {
                        e.preventDefault();
                        onChange(filteredOptions[0].value);
                        setOpen(false);
                      }
                    }}
                    placeholder={searchPlaceholder}
                    className="h-8 w-full rounded border border-border-gold/35 bg-bg/80 pl-8 pr-7 text-xs text-text placeholder:text-text-faint outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold/30"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 text-text-faint hover:text-text"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <ul
              role="listbox"
              className="max-h-60 overflow-y-auto py-1"
            >
              {filteredOptions.length === 0 && (
                <li className="px-4 py-3 text-center text-fluid--1 text-text-faint">
                  {query ? `No match for "${query}"` : "No options"}
                </li>
              )}
              {filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "group block w-full px-4 py-2.5 text-left text-fluid-0 text-text transition-colors",
                        isSelected ? "bg-gold/10 text-gold" : "hover:bg-surface",
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate">{opt.label}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          {opt.description && (
                            <span className="text-[0.7rem] font-medium tracking-wider text-text-faint/80 uppercase">
                              {opt.description}
                            </span>
                          )}
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-gold" />}
                        </span>
                      </span>
                      {opt.hint && (
                        <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] motion-reduce:transition-none">
                          <span className="overflow-hidden">
                            <span className="block pt-1 text-fluid--1 font-light leading-5 text-text-muted">
                              {opt.hint}
                            </span>
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <span className="text-fluid--1 text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
