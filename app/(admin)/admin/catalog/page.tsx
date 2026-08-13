"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useRefreshOnFocus } from "@/lib/admin/use-fresh-server-data";
import { cn } from "@/lib/utils";

// The Make / Model / Trim lists the public valuation form is built from.
// Everything here is live: what is added on this page is what the next visitor
// sees in the form's dropdowns.
//
// Laid out as master–detail rather than one long grid. The catalog is roughly
// ten makes, forty models and sixty trims; showing all of it expanded at once
// put over a hundred items on screen with wrapping chips that ran into each
// other, and no way to find anything. Here one make is in view at a time, its
// models collapse until opened, and search narrows the make list as you type.
//
// The add forms sit inside the thing they add to — make at the foot of the
// make list, model in the make's own pane, trim inside the model it belongs
// to. A row of three "add" cards at the top of the page implied you would add a
// make, a model and a trim in one sitting, which is not how this gets used.
//
// Deletes are confirmed because they cascade: removing a make takes its models
// and all of their trims, and there is no undo.

type Trim = { id: string; name: string };
type Model = { id: string; name: string; trims: Trim[] };
type Make = { id: string; name: string; models: Model[] };

type PendingDelete =
  | { kind: "make"; id: string; name: string; modelCount: number }
  | { kind: "model"; id: string; name: string; trimCount: number }
  | { kind: "trim"; id: string; name: string };

export default function AdminCatalogPage() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [openModelIds, setOpenModelIds] = useState<Set<string>>(new Set());

  const [newMakeName, setNewMakeName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [trimDrafts, setTrimDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

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
  const selected = makes.find((make) => make.id === selectedMakeId) ?? filteredMakes[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedMakeId) setSelectedMakeId(selected.id);
  }, [selected, selectedMakeId]);

  function toggleModel(id: string) {
    setOpenModelIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function post(endpoint: string, body: unknown, failure: string) {
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? failure);
        return false;
      }
      await loadCatalog();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    }
  }

  async function addMake() {
    const name = newMakeName.trim();
    if (!name) return;
    setBusy("make");
    if (await post("/api/admin/catalog/makes", { name }, "Couldn't add that make.")) setNewMakeName("");
    setBusy(null);
  }

  async function addModel() {
    const name = newModelName.trim();
    if (!name || !selected) return;
    setBusy("model");
    if (await post("/api/admin/catalog/models", { makeId: selected.id, name }, "Couldn't add that model.")) {
      setNewModelName("");
    }
    setBusy(null);
  }

  async function addTrim(modelId: string) {
    const name = (trimDrafts[modelId] ?? "").trim();
    if (!name) return;
    setBusy(modelId);
    if (await post("/api/admin/catalog/trims", { modelId, name }, "Couldn't add that trim.")) {
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
        setError(json?.error?.message ?? "Couldn't remove that entry.");
        return;
      }
      if (pending.kind === "make" && pending.id === selectedMakeId) setSelectedMakeId("");
      await loadCatalog();
    } catch {
      setError("Network error while removing that entry.");
    } finally {
      setDeleting(false);
      setDialogOpen(false);
    }
  }

  const totals = useMemo(() => {
    const models = makes.reduce((sum, make) => sum + make.models.length, 0);
    const trims = makes.reduce(
      (sum, make) => sum + make.models.reduce((s, model) => s + model.trims.length, 0),
      0,
    );
    return { models, trims };
  }, [makes]);

  const selectedTrimCount = selected?.models.reduce((sum, model) => sum + model.trims.length, 0) ?? 0;

  if (loading) {
    return (
      <Card className="p-5">
        <p className="text-fluid--1 text-text-muted">Loading catalog…</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Vehicle Catalog</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          The Make, Model, and Trim options customers choose from in the valuation form. Changes here are live —{" "}
          {makes.length} makes · {totals.models} models · {totals.trims} trims.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19rem_1fr]">
        {/* ── Makes ─────────────────────────────────────────────── */}
        <Card className="flex h-fit flex-col p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search make or model…"
              className="h-10 w-full rounded-card border border-border bg-surface-2 pl-9 pr-9 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <ul className="mt-3 flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto">
            {filteredMakes.length === 0 && (
              <li className="px-3 py-6 text-center text-fluid--1 text-text-faint">No makes match that search.</li>
            )}
            {filteredMakes.map((make) => {
              const active = selected?.id === make.id;
              return (
                <li key={make.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedMakeId(make.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-card px-3 py-2.5 text-left text-fluid--1 transition-colors",
                      active ? "bg-gold/15 text-gold" : "text-text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <span className="truncate">{make.name}</span>
                    <span className={cn("shrink-0 text-[0.72rem]", active ? "text-gold/70" : "text-text-faint")}>
                      {make.models.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <input
              value={newMakeName}
              onChange={(e) => setNewMakeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addMake()}
              placeholder="Add a make…"
              className="h-10 w-full min-w-0 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
            />
            <Button
              className="shrink-0 px-3"
              onClick={() => void addMake()}
              disabled={busy === "make" || !newMakeName.trim()}
              title="Add make"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* ── Selected make ─────────────────────────────────────── */}
        {!selected ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-fluid-0 text-text">No makes yet.</p>
            <p className="text-fluid--1 text-text-muted">Add your first make using the box on the left.</p>
          </Card>
        ) : (
          <Card className="flex flex-col gap-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="font-display text-fluid-1 text-text">{selected.name}</h2>
                <p className="mt-0.5 text-fluid--1 text-text-muted">
                  {selected.models.length} {selected.models.length === 1 ? "model" : "models"} · {selectedTrimCount}{" "}
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
                <Trash2 className="h-4 w-4" /> Remove make
              </Button>
            </div>

            <div className="flex gap-2">
              <input
                value={newModelName}
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

            {selected.models.length === 0 ? (
              <p className="py-6 text-center text-fluid--1 text-text-faint">
                No models yet. A make with no models is hidden from the valuation form.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selected.models.map((model) => {
                  const open = openModelIds.has(model.id);
                  return (
                    <li key={model.id} className="rounded-card border border-border">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleModel(model.id)}
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
                          aria-label={`Remove ${model.name}`}
                          onClick={() =>
                            askDelete({
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
                              No trims set. The form offers Standard / Mid / Top of the Range instead.
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
                                    aria-label={`Remove trim ${trim.name}`}
                                    onClick={() => askDelete({ kind: "trim", id: trim.id, name: trim.name })}
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
                              value={trimDrafts[model.id] ?? ""}
                              onChange={(e) =>
                                setTrimDrafts((current) => ({ ...current, [model.id]: e.target.value }))
                              }
                              onKeyDown={(e) => e.key === "Enter" && void addTrim(model.id)}
                              placeholder="Add a trim…"
                              className="h-9 w-full min-w-0 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
                            />
                            <Button
                              variant="outline"
                              className="shrink-0 px-3"
                              onClick={() => void addTrim(model.id)}
                              disabled={busy === model.id || !(trimDrafts[model.id] ?? "").trim()}
                              title="Add trim"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={
          pending?.kind === "make"
            ? "Remove this make?"
            : pending?.kind === "model"
              ? "Remove this model?"
              : "Remove this trim?"
        }
        description={
          pending?.kind === "make" ? (
            <>
              Removing <span className="text-text">{pending.name}</span> also removes its{" "}
              {pending.modelCount === 1 ? "1 model" : `${pending.modelCount} models`} and every trim under them.
              Customers will no longer see this make in the valuation form. This cannot be undone.
            </>
          ) : pending?.kind === "model" ? (
            <>
              Removing <span className="text-text">{pending.name}</span> also removes its{" "}
              {pending.trimCount === 1 ? "1 trim" : `${pending.trimCount} trims`}. This cannot be undone.
            </>
          ) : (
            <>
              <span className="text-text">{pending?.name}</span> will no longer be offered as a trim for this model.
              This cannot be undone.
            </>
          )
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={() => void runDelete()}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
