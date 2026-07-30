"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// The Make / Model / Trim lists the public valuation form is built from.
// Everything here is live: what is added on this page is what the next visitor
// sees in the form's dropdowns.
//
// Deletes are confirmed because they cascade. Removing a brand takes its models
// with it, and removing a model takes its trims — one stray click could empty a
// large part of the catalog with nothing to undo it.

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

  const [newMakeName, setNewMakeName] = useState("");
  const [addingMake, setAddingMake] = useState(false);

  const [modelMakeId, setModelMakeId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [addingModel, setAddingModel] = useState(false);

  const [trimMakeId, setTrimMakeId] = useState("");
  const [trimModelId, setTrimModelId] = useState("");
  const [newTrimName, setNewTrimName] = useState("");
  const [addingTrim, setAddingTrim] = useState(false);

  // `pending` outlives the dialog's exit animation so the closing dialog cannot
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

  async function addMake() {
    const name = newMakeName.trim();
    if (!name) return;
    setAddingMake(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog/makes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't add that brand.");
        return;
      }
      setNewMakeName("");
      await loadCatalog();
    } catch {
      setError("Network error while adding the brand.");
    } finally {
      setAddingMake(false);
    }
  }

  async function addModel() {
    const name = newModelName.trim();
    if (!name || !modelMakeId) return;
    setAddingModel(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makeId: modelMakeId, name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't add that model.");
        return;
      }
      setNewModelName("");
      await loadCatalog();
    } catch {
      setError("Network error while adding the model.");
    } finally {
      setAddingModel(false);
    }
  }

  async function addTrim() {
    const name = newTrimName.trim();
    if (!name || !trimModelId) return;
    setAddingTrim(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog/trims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: trimModelId, name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't add that trim.");
        return;
      }
      setNewTrimName("");
      await loadCatalog();
    } catch {
      setError("Network error while adding the trim.");
    } finally {
      setAddingTrim(false);
    }
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
      // Clear any selection pointing at something that no longer exists.
      if (pending.kind === "make") {
        if (modelMakeId === pending.id) setModelMakeId("");
        if (trimMakeId === pending.id) {
          setTrimMakeId("");
          setTrimModelId("");
        }
      }
      if (pending.kind === "model" && trimModelId === pending.id) setTrimModelId("");
      await loadCatalog();
    } catch {
      setError("Network error while removing that entry.");
    } finally {
      setDeleting(false);
      setDialogOpen(false);
    }
  }

  const trimModelOptions = (makes.find((m) => m.id === trimMakeId)?.models ?? []).map((model) => ({
    label: model.name,
    value: model.id,
  }));

  const totalModels = makes.reduce((sum, make) => sum + make.models.length, 0);
  const totalTrims = makes.reduce(
    (sum, make) => sum + make.models.reduce((s, model) => s + model.trims.length, 0),
    0,
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
      <div>
        <h1 className="font-display text-fluid-3 text-text">Vehicle Catalog</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          The Make, Model, and Trim options customers choose from in the valuation form. Changes here are live.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Add a brand</h3>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Aston Martin"
              value={newMakeName}
              onChange={(e) => setNewMakeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addMake()}
            />
            <Button onClick={() => void addMake()} disabled={addingMake || !newMakeName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-fluid--1 text-text-faint">
            A brand with no models is hidden from the form until you add one.
          </p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Add a model</h3>
          <Select
            placeholder="Choose a brand"
            options={makes.map((m) => ({ label: m.name, value: m.id }))}
            value={modelMakeId}
            onChange={setModelMakeId}
          />
          <div className="flex gap-2">
            <Input
              placeholder="e.g. DBX"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addModel()}
              disabled={!modelMakeId}
            />
            <Button onClick={() => void addModel()} disabled={addingModel || !modelMakeId || !newModelName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-fluid--1 text-text-faint">Choose a brand first.</p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Add a trim</h3>
          <Select
            placeholder="Choose a brand"
            options={makes.map((m) => ({ label: m.name, value: m.id }))}
            value={trimMakeId}
            onChange={(v) => {
              setTrimMakeId(v);
              setTrimModelId("");
            }}
          />
          <Select
            placeholder={trimMakeId ? "Choose a model" : "Choose a brand first"}
            options={trimModelOptions}
            value={trimModelId}
            onChange={setTrimModelId}
            disabled={!trimMakeId}
          />
          <div className="flex gap-2">
            <Input
              placeholder="e.g. R-Dynamic HSE"
              value={newTrimName}
              onChange={(e) => setNewTrimName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addTrim()}
              disabled={!trimModelId}
            />
            <Button onClick={() => void addTrim()} disabled={addingTrim || !trimModelId || !newTrimName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-fluid--1 text-text-faint">
            A model with no trims falls back to Standard / Mid / Top of the Range.
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-5 p-5">
        <div>
          <h3 className="text-fluid-0 text-text">Current catalog</h3>
          <p className="mt-1 text-fluid--1 text-text-muted">
            {makes.length} brands · {totalModels} models · {totalTrims} trims
          </p>
        </div>

        {makes.length === 0 ? (
          <p className="text-fluid--1 text-text-faint">No brands yet — add one above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {makes.map((make) => (
              <div key={make.id} className="rounded-card border border-border bg-surface-2/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fluid-0 font-medium text-text">{make.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${make.name}`}
                    onClick={() => askDelete({ kind: "make", id: make.id, name: make.name, modelCount: make.models.length })}
                    className="text-text-faint transition-colors hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <ul className="mt-3 flex flex-col gap-3">
                  {make.models.length === 0 && <li className="text-fluid--1 text-text-faint">No models yet.</li>}
                  {make.models.map((model) => (
                    <li key={model.id}>
                      <div className="flex items-center justify-between gap-2 text-fluid--1 text-text">
                        {model.name}
                        <button
                          type="button"
                          aria-label={`Remove ${model.name}`}
                          onClick={() =>
                            askDelete({ kind: "model", id: model.id, name: model.name, trimCount: model.trims.length })
                          }
                          className="text-text-faint transition-colors hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {model.trims.length === 0 ? (
                        <p className="mt-1 pl-3 text-[0.72rem] text-text-faint">No trims — using the generic list.</p>
                      ) : (
                        <ul className="mt-1 flex flex-wrap gap-1.5 pl-3">
                          {model.trims.map((trim) => (
                            <li
                              key={trim.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[0.72rem] text-text-muted"
                            >
                              {trim.name}
                              <button
                                type="button"
                                aria-label={`Remove trim ${trim.name}`}
                                onClick={() => askDelete({ kind: "trim", id: trim.id, name: trim.name })}
                                className="text-text-faint transition-colors hover:text-danger"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={
          pending?.kind === "make"
            ? "Remove this brand?"
            : pending?.kind === "model"
              ? "Remove this model?"
              : "Remove this trim?"
        }
        description={
          pending?.kind === "make" ? (
            <>
              Removing <span className="text-text">{pending.name}</span> also removes its{" "}
              {pending.modelCount === 1 ? "1 model" : `${pending.modelCount} models`} and every trim under them.
              Customers will no longer see this brand in the valuation form. This cannot be undone.
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
