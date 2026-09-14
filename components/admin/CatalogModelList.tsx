"use client";

import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CatalogPagination,
  CATALOG_MODELS_PER_PAGE,
} from "@/components/admin/CatalogPagination";
import type {
  CatalogMake,
  CatalogModel,
  PendingCatalogArchive,
} from "@/lib/admin/catalog-types";

const normalized = (value: string) => value.trim().toLocaleLowerCase();

export function CatalogModelList({
  make,
  page,
  onPage,
  openModelIds,
  onToggle,
  trimDrafts,
  onTrimDraftChange,
  onAddTrim,
  onArchive,
  busy,
}: {
  make: CatalogMake;
  page: number;
  onPage: (page: number) => void;
  openModelIds: Set<string>;
  onToggle: (id: string) => void;
  trimDrafts: Record<string, string>;
  onTrimDraftChange: (modelId: string, value: string) => void;
  onAddTrim: (modelId: string) => void;
  onArchive: (target: PendingCatalogArchive) => void;
  busy: string | null;
}) {
  return (
    <>
      <ul className="flex flex-col gap-2">
        {make.models
          .slice(
            (page - 1) * CATALOG_MODELS_PER_PAGE,
            page * CATALOG_MODELS_PER_PAGE,
          )
          .map((model) => (
            <CatalogModelRow
              key={model.id}
              makeName={make.name}
              model={model}
              open={openModelIds.has(model.id)}
              trimDraft={trimDrafts[model.id] ?? ""}
              busy={busy === model.id}
              onToggle={() => onToggle(model.id)}
              onTrimDraftChange={(value) => onTrimDraftChange(model.id, value)}
              onAddTrim={() => onAddTrim(model.id)}
              onArchive={onArchive}
            />
          ))}
      </ul>
      <CatalogPagination
        page={page}
        totalItems={make.models.length}
        onPage={onPage}
      />
    </>
  );
}

function CatalogModelRow({
  makeName,
  model,
  open,
  trimDraft,
  busy,
  onToggle,
  onTrimDraftChange,
  onAddTrim,
  onArchive,
}: {
  makeName: string;
  model: CatalogModel;
  open: boolean;
  trimDraft: string;
  busy: boolean;
  onToggle: () => void;
  onTrimDraftChange: (value: string) => void;
  onAddTrim: () => void;
  onArchive: (target: PendingCatalogArchive) => void;
}) {
  const duplicate = model.trims.find(
    (trim) => normalized(trim.name) === normalized(trimDraft),
  );
  return (
    <li className="rounded-card border border-border">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-gold" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-text-faint" />
          )}
          <span className="truncate text-fluid--1 text-text">{model.name}</span>
          <span className="shrink-0 text-[0.72rem] text-text-faint">
            {model.trims.length === 0
              ? "generic trims"
              : `${model.trims.length} ${model.trims.length === 1 ? "trim" : "trims"}`}
          </span>
        </button>
        <button
          type="button"
          aria-label={`Archive ${model.name}`}
          onClick={() =>
            onArchive({
              kind: "model",
              id: model.id,
              name: model.name,
              trimCount: model.trims.length,
            })
          }
          className="shrink-0 text-text-faint transition-colors hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-3 py-3 animate-fade-in">
          {model.trims.length === 0 ? (
            <p className="mb-3 text-fluid--1 text-text-faint">
              No trims set. The form offers Standard / Mid / Top of the Range
              instead.
            </p>
          ) : (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {model.trims.map((trim) => (
                <li
                  key={trim.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-[0.78rem] text-text-muted"
                >
                  {trim.name}
                  <button
                    type="button"
                    aria-label={`Archive trim ${trim.name}`}
                    onClick={() =>
                      onArchive({ kind: "trim", id: trim.id, name: trim.name })
                    }
                    className="text-text-faint transition-colors hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={trimDraft}
              maxLength={120}
              onChange={(e) => onTrimDraftChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddTrim()}
              placeholder="Add a trim…"
              className="h-9 w-full min-w-0 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
            />
            <Button
              variant="outline"
              className="shrink-0 px-3"
              onClick={onAddTrim}
              disabled={busy || !trimDraft.trim()}
              title="Add trim"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {duplicate && trimDraft.trim() && (
            <p className="mt-1.5 text-[0.72rem] text-gold">
              Existing trim on {makeName} {model.name}: {duplicate.name}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
