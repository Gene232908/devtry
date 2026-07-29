"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
};

export function Select({ label, placeholder = "Select", options, value, onChange, disabled, error, name }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
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
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-card border border-border-gold/80 bg-surface-2 py-1 shadow-[0_18px_42px_-18px_rgba(0,0,0,.9)] animate-fade-in"
          >
            {options.length === 0 && (
              <li className="px-4 py-2 text-fluid--1 text-text-faint">No options</li>
            )}
            {options.map((opt) => {
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
                      {opt.label}
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-gold" />}
                    </span>
                    {opt.hint && (
                      // Collapsed until hover/focus so the list stays scannable.
                      // grid-rows 0fr -> 1fr animates height without hard-coding
                      // one, so a longer hint can never be clipped.
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
