"use client";

import { Plus, Search, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { CatalogMake } from "@/lib/admin/catalog-types";

export function CatalogMakeSidebar({
  makes,
  selectedId,
  search,
  onSearch,
  onSelect,
  draft,
  onDraftChange,
  onAdd,
  busy,
  duplicate,
}: {
  makes: CatalogMake[];
  selectedId: string;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  busy: boolean;
  duplicate?: CatalogMake;
}) {
  return (
    <Card className="flex h-fit flex-col p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search make or model…"
          className="h-10 w-full rounded-card border border-border bg-surface-2 pl-9 pr-9 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ul className="mt-3 flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto">
        {makes.length === 0 && (
          <li className="px-3 py-6 text-center text-fluid--1 text-text-faint">
            No makes match that search.
          </li>
        )}
        {makes.map((make) => (
          <li key={make.id}>
            <button
              type="button"
              onClick={() => onSelect(make.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-card px-3 py-2.5 text-left text-fluid--1 transition-colors",
                selectedId === make.id
                  ? "bg-gold/15 text-gold"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span className="truncate">{make.name}</span>
              <span
                className={cn(
                  "shrink-0 text-[0.72rem]",
                  selectedId === make.id ? "text-gold/70" : "text-text-faint",
                )}
              >
                {make.models.length}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex gap-2">
          <input
            value={draft}
            maxLength={120}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="Add a make…"
            className="h-10 w-full min-w-0 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
          />
          <Button
            className="shrink-0 px-3"
            onClick={onAdd}
            disabled={busy || !draft.trim()}
            title="Add make"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {duplicate && draft.trim() && (
          <p className="mt-1.5 text-[0.72rem] text-gold">
            Existing make: {duplicate.name}
          </p>
        )}
      </div>
    </Card>
  );
}
