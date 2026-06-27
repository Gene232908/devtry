"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { label: string; value: string };

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
      {label && <span className="text-fluid--1 text-text-muted">{label}</span>}
      <div className="relative">
        <button
          type="button"
          name={name}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-card border border-border bg-surface-2 px-4 text-fluid-0 text-text outline-none transition-shadow duration-150",
            open && "gold-glow border-gold",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-danger",
          )}
        >
          <span className={cn(!selected && "text-text-faint")}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform duration-150", open && "rotate-180 text-gold")} />
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-card border border-border-gold bg-surface-2 py-1 shadow-[0_10px_30px_-8px_rgba(0,0,0,.7)] animate-fade-in"
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
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-fluid-0 text-text transition-colors",
                      isSelected ? "bg-gold/10 text-gold" : "hover:bg-surface",
                    )}
                  >
                    {opt.label}
                    {isSelected && <Check className="h-4 w-4 text-gold" />}
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
