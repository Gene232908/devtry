"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRefreshOnFocus } from "@/lib/admin/use-fresh-server-data";
import { CatalogSpecificationsCard } from "@/components/admin/CatalogSpecificationsCard";
import {
  CatalogActivityPanel,
  type CatalogActivity,
} from "@/components/admin/CatalogActivityPanel";
import { CatalogModelList } from "@/components/admin/CatalogModelList";
import { CatalogMakeSidebar } from "@/components/admin/CatalogMakeSidebar";
import { CATALOG_MODELS_PER_PAGE } from "@/components/admin/CatalogPagination";
import { CatalogToast } from "@/components/admin/CatalogToast";
import { postCatalog } from "@/lib/admin/catalog-client";

// Live master-detail editor for the valuation form's Make / Model / Trim lists.
// Deletes are confirmed because removing a parent cascades to its children.

import type {
  CatalogMake as Make,
  PendingCatalogArchive as PendingDelete,
} from "@/lib/admin/catalog-types";

type CatalogToastState = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

function normalizedCatalogName(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function AdminCatalogPage() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [openModelIds, setOpenModelIds] = useState<Set<string>>(new Set());
  const [modelPage, setModelPage] = useState(1);
  const [newMakeName, setNewMakeName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [trimDrafts, setTrimDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<CatalogToastState | null>(null);
  const [activity, setActivity] = useState<CatalogActivity[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // `pending` outlives the dialog's exit animation so a closing dialog cannot
  // flash the wrong wording on its way out.
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadCatalog = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't load the vehicle catalog.");
        return;
      }
      setMakes(json.data.makes as Make[]);
    } catch {
      setError("Network error while loading the catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const loadActivity = useCallback(async () => {
    const response = await fetch("/api/admin/catalog/activity", {
      cache: "no-store",
    });
    const json = await response.json().catch(() => null);
    if (response.ok && json?.ok)
      setActivity(json.data.events as CatalogActivity[]);
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  // Keeps the catalog current without a manual reload. It used to fetch once on
  // mount and never again — not on focus, not on any timer — so a make added
  // from another tab or by a colleague simply was not there until the page was
  // reloaded by hand.
  //
  // A background refresh replaces `makes` only; the selected make, the open
  // models, the search box and any half-typed "add" field are all separate
  // state and survive it untouched.
  useRefreshOnFocus(loadCatalog);

  // Search matches model names too, so typing "Velar" finds the make it sits
  // under rather than returning nothing.
  const filteredMakes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return makes;
    return makes.filter(
      (make) =>
        make.name.toLowerCase().includes(q) ||
        make.models.some((model) => model.name.toLowerCase().includes(q)),
    );
  }, [makes, search]);

  // Keep a make in view at all times: fall back to the first available one
  // whenever the selection disappears or filters out.
  const selected =
    makes.find((make) => make.id === selectedMakeId) ??
    filteredMakes[0] ??
    null;

  useEffect(() => {
    if (selected && selected.id !== selectedMakeId)
      setSelectedMakeId(selected.id);
  }, [selected, selectedMakeId]);

  useEffect(() => setModelPage(1), [selected?.id]);
  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((selected?.models.length ?? 0) / CATALOG_MODELS_PER_PAGE),
    );
    setModelPage((current) => Math.min(current, totalPages));
  }, [selected?.models.length]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      setToast({ id: Date.now(), message, actionLabel, onAction });
    },
    [],
  );

  function toggleModel(id: string) {
    setOpenModelIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function post<T>(
    endpoint: string,
    body: unknown,
    failure: string,
  ): Promise<T | null> {
    setError(null);
    const result = await postCatalog<T>(endpoint, body, failure);
    if (!result.ok) setError(result.message);
    return result.ok ? result.data : null;
  }

  async function addMake() {
    const name = newMakeName.trim();
    if (!name || busy) return;
    const existingMake = makes.find(
      (make) =>
        normalizedCatalogName(make.name) === normalizedCatalogName(name),
    );
    if (existingMake) {
      showToast(`This make already exists: ${existingMake.name}.`);
      return;
    }
    setBusy("make");
    const result = await post<{ make: { id: string; name: string } }>(
      "/api/admin/catalog/makes",
      { name },
      "Couldn't add that make.",
    );
    if (result) {
      setMakes((current) => [
        ...current,
        { id: result.make.id, name: result.make.name, models: [] },
      ]);
      setSelectedMakeId(result.make.id);
      setNewMakeName("");
    }
    setBusy(null);
  }

  async function addModel() {
    const name = newModelName.trim();
    if (!name || !selected || busy) return;
    const existingModel = selected.models.find(
      (model) =>
        normalizedCatalogName(model.name) === normalizedCatalogName(name),
    );
    if (existingModel) {
      showToast(`This model already exists on ${selected.name}.`);
      return;
    }
    setBusy("model");
    const result = await post<{ model: { id: string; name: string } }>(
      "/api/admin/catalog/models",
      { makeId: selected.id, name },
      "Couldn't add that model.",
    );
    if (result) {
      setMakes((current) =>
        current.map((make) =>
          make.id === selected.id
            ? {
                ...make,
                models: [
                  ...make.models,
                  { id: result.model.id, name: result.model.name, trims: [] },
                ],
              }
            : make,
        ),
      );
      setModelPage(
        Math.ceil((selected.models.length + 1) / CATALOG_MODELS_PER_PAGE),
      );
      setNewModelName("");
    }
    setBusy(null);
  }

  async function addTrim(modelId: string) {
    const name = (trimDrafts[modelId] ?? "").trim();
    if (!name || busy) return;
    const parent = makes
      .flatMap((make) => make.models.map((model) => ({ make, model })))
      .find(({ model }) => model.id === modelId);
    const existingTrim = parent?.model.trims.find(
      (trim) =>
        normalizedCatalogName(trim.name) === normalizedCatalogName(name),
    );
    if (parent && existingTrim) {
      showToast(
        `This trim already exists on ${parent.make.name} ${parent.model.name}.`,
      );
      return;
    }
    setBusy(modelId);
    const result = await post<{ trim: { id: string; name: string } }>(
      "/api/admin/catalog/trims",
      { modelId, name },
      "Couldn't add that trim.",
    );
    if (result) {
      setMakes((current) =>
        current.map((make) => ({
          ...make,
          models: make.models.map((model) =>
            model.id === modelId
              ? {
                  ...model,
                  trims: [
                    ...model.trims,
                    { id: result.trim.id, name: result.trim.name },
                  ],
                }
              : model,
          ),
        })),
      );
      setTrimDrafts((current) => ({ ...current, [modelId]: "" }));
    }
    setBusy(null);
  }

  function askDelete(target: PendingDelete) {
    setPending(target);
    setDialogOpen(true);
  }

  async function runDelete() {
    if (!pending) return;
    setDeleting(true);
    setError(null);

    const endpoint =
      pending.kind === "make"
        ? `/api/admin/catalog/makes/${pending.id}`
        : pending.kind === "model"
          ? `/api/admin/catalog/models/${pending.id}`
          : `/api/admin/catalog/trims/${pending.id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't hide that entry.");
        return;
      }
      if (pending.kind === "make" && pending.id === selectedMakeId)
        setSelectedMakeId("");
      await loadCatalog();
      await loadActivity();
      showToast(
        `${pending.name} is now hidden from the valuation form.`,
        "Undo",
        () => {
          void restoreEntry(pending.kind, pending.id, pending.name);
        },
      );
    } catch {
      setError("Network error while archiving that entry.");
    } finally {
      setDeleting(false);
      setDialogOpen(false);
    }
  }

  async function restoreEntry(
    kind: "make" | "model" | "trim",
    id: string,
    name: string,
  ) {
    setRestoringId(id);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/catalog/${kind === "make" ? "makes" : kind === "model" ? "models" : "trims"}/${id}`,
        { method: "PATCH" },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't restore that entry.");
        return;
      }
      await Promise.all([loadCatalog(), loadActivity()]);
      showToast(`${name} has been restored.`);
    } catch {
      setError("Network error while restoring that entry.");
    } finally {
      setRestoringId(null);
    }
  }

  const totals = useMemo(() => {
    const models = makes.reduce((sum, make) => sum + make.models.length, 0);
    const trims = makes.reduce(
      (sum, make) =>
        sum + make.models.reduce((s, model) => s + model.trims.length, 0),
      0,
    );
    return { models, trims };
  }, [makes]);

  const selectedTrimCount =
    selected?.models.reduce((sum, model) => sum + model.trims.length, 0) ?? 0;
  const makeDuplicate = makes.find(
    (make) =>
      normalizedCatalogName(make.name) === normalizedCatalogName(newMakeName),
  );
  const modelDuplicate = selected?.models.find(
    (model) =>
      normalizedCatalogName(model.name) === normalizedCatalogName(newModelName),
  );

  if (loading) {
    return (
      <Card className="p-5">
        <p className="text-fluid--1 text-text-muted">Loading catalog…</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <CatalogToast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onDismiss={() => setToast(null)}
        />
      )}
      <div>
        <h1 className="font-display text-fluid-3 text-text">Vehicle Catalog</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          The Make, Model, and Trim options customers choose from in the
          valuation form. Changes here are live — {makes.length} makes ·{" "}
          {totals.models} models · {totals.trims} trims.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      <CatalogSpecificationsCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19rem_1fr]">
        <CatalogMakeSidebar
          makes={filteredMakes}
          selectedId={selected?.id ?? ""}
          search={search}
          onSearch={setSearch}
          onSelect={setSelectedMakeId}
          draft={newMakeName}
          onDraftChange={setNewMakeName}
          onAdd={() => void addMake()}
          busy={busy === "make"}
          duplicate={makeDuplicate}
        />

        {/* ── Selected make ─────────────────────────────────────── */}
        {!selected ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-fluid-0 text-text">No makes yet.</p>
            <p className="text-fluid--1 text-text-muted">
              Add your first make using the box on the left.
            </p>
          </Card>
        ) : (
          <Card className="flex flex-col gap-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="font-display text-fluid-1 text-text">
                  {selected.name}
                </h2>
                <p className="mt-0.5 text-fluid--1 text-text-muted">
                  {selected.models.length}{" "}
                  {selected.models.length === 1 ? "model" : "models"} ·{" "}
                  {selectedTrimCount}{" "}
                  {selectedTrimCount === 1 ? "trim" : "trims"}
                </p>
              </div>
              <Button
                variant="outline"
                className="text-danger hover:bg-danger/10"
                onClick={() =>
                  askDelete({
                    kind: "make",
                    id: selected.id,
                    name: selected.name,
                    modelCount: selected.models.length,
                  })
                }
              >
                <Trash2 className="h-4 w-4" /> Hide make
              </Button>
            </div>

            <div>
              <div className="flex gap-2">
                <input
                  value={newModelName}
                  maxLength={120}
                  onChange={(e) => setNewModelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addModel()}
                  placeholder={`Add a model to ${selected.name}…`}
                  className="h-10 w-full min-w-0 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
                />
                <Button
                  className="shrink-0 px-3"
                  onClick={() => void addModel()}
                  disabled={busy === "model" || !newModelName.trim()}
                  title="Add model"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {modelDuplicate && newModelName.trim() && (
                <p className="mt-1.5 text-[0.72rem] text-gold">
                  Existing model on {selected.name}: {modelDuplicate.name}
                </p>
              )}
            </div>

            {selected.models.length === 0 ? (
              <p className="py-6 text-center text-fluid--1 text-text-faint">
                No models yet. A make with no models is hidden from the
                valuation form.
              </p>
            ) : (
              <CatalogModelList
                make={selected}
                page={modelPage}
                onPage={setModelPage}
                openModelIds={openModelIds}
                onToggle={toggleModel}
                trimDrafts={trimDrafts}
                onTrimDraftChange={(modelId, value) =>
                  setTrimDrafts((current) => ({ ...current, [modelId]: value }))
                }
                onAddTrim={(modelId) => void addTrim(modelId)}
                onArchive={askDelete}
                busy={busy}
              />
            )}
          </Card>
        )}
      </div>

      <CatalogActivityPanel
        events={activity}
        restoringId={restoringId}
        onRestore={(event) =>
          void restoreEntry(
            event.entity_type,
            event.entity_id,
            event.entity_name,
          )
        }
      />

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={
          pending?.kind === "make"
            ? "Hide this make from the valuation form?"
            : pending?.kind === "model"
              ? "Hide this model from the valuation form?"
              : "Hide this trim from the valuation form?"
        }
        description={
          pending?.kind === "make" ? (
            <>
              Hiding <span className="text-text">{pending.name}</span> hides
              its{" "}
              {pending.modelCount === 1
                ? "1 model"
                : `${pending.modelCount} models`}{" "}
              and every trim under them. Historical records stay intact and you
              can restore it later.
            </>
          ) : pending?.kind === "model" ? (
            <>
              Hiding <span className="text-text">{pending.name}</span> hides
              its{" "}
              {pending.trimCount === 1
                ? "1 trim"
                : `${pending.trimCount} trims`}
              . Historical records stay intact and you can restore it later.
            </>
          ) : (
            <>
              <span className="text-text">{pending?.name}</span> will no longer
              be offered as a trim for this model. Historical records stay
              intact and you can restore it later.
            </>
          )
        }
        confirmLabel="Hide from valuation form"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={() => void runDelete()}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
