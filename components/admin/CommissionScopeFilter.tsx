"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const COMMISSION_SCOPES = ["agents", "purchasers", "developer"] as const;
export type CommissionScope = (typeof COMMISSION_SCOPES)[number];

const SCOPE_LABEL: Record<CommissionScope, string> = {
  agents: "Agents",
  purchasers: "Purchasers",
  developer: "Developer",
};

type Props = {
  selected: CommissionScope[];
  onChange: (selected: CommissionScope[]) => void;
};

/**
 * Multi-select control for the Super Admin Commission page.
 *
 * It is deliberately a local UI filter: the server still decides which
 * commission records the signed-in role may read or settle.
 */
export function CommissionScopeFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allSelected = selected.length === COMMISSION_SCOPES.length;

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function setScope(scope: CommissionScope, checked: boolean) {
    const next = checked
      ? COMMISSION_SCOPES.filter((item) => selected.includes(item) || item === scope)
      : selected.filter((item) => item !== scope);
    onChange(next);
  }

  function toggleAll(checked: boolean) {
    onChange(checked ? [...COMMISSION_SCOPES] : []);
  }

  const buttonLabel = allSelected
    ? "All"
    : selected.length === 0
      ? "Choose roles"
      : selected.map((scope) => SCOPE_LABEL[scope]).join(", ");

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="flex min-h-11 items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-fluid--1 text-text transition-colors hover:bg-surface-2/80"
      >
        {buttonLabel}
        <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Commission categories"
          className="absolute right-0 z-20 mt-1 w-52 rounded-card border border-border bg-surface p-1.5 card-shadow animate-fade-in"
        >
          <CheckboxRow
            label="All"
            checked={allSelected}
            onChange={toggleAll}
            className="border-b border-border/70 pb-1.5"
          />
          {COMMISSION_SCOPES.map((scope) => (
            <CheckboxRow
              key={scope}
              label={SCOPE_LABEL[scope]}
              checked={selected.includes(scope)}
              onChange={(checked) => setScope(scope, checked)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 text-fluid--1 text-text hover:bg-surface-2", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked ? "border-gold bg-gold text-black" : "border-text-faint/70 bg-bg",
        )}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </span>
      <span>{label}</span>
    </label>
  );
}
