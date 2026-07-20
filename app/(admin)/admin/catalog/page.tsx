"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Model = { id: string; name: string };
type Make = { id: string; name: string; models: Model[] };

export default function AdminCatalogPage() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMakeName, setNewMakeName] = useState("");
  const [addingMake, setAddingMake] = useState(false);

  const [modelMakeId, setModelMakeId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [addingModel, setAddingModel] = useState(false);

  async function loadCatalog() {
    setLoading(true);
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
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

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

  async function removeMake(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalog/makes/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't remove that brand.");
        return;
      }
      setMakes((all) => all.filter((m) => m.id !== id));
      if (modelMakeId === id) setModelMakeId("");
    } catch {
      setError("Network error while removing the brand.");
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

  async function removeModel(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalog/models/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "Couldn't remove that model.");
        return;
      }
      await loadCatalog();
    } catch {
      setError("Network error while removing the model.");
    }
  }

  if (loading) {
    return <p className="text-fluid--1 text-text-muted">Loading catalog…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Vehicle Catalog</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          Brands and models shown in the public valuation form&apos;s Make/Model dropdowns.
        </p>
      </div>

      {error && <p className="text-fluid--1 text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          <p className="text-fluid--1 text-text-faint">New brands appear immediately in the public form.</p>
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
          <p className="text-fluid--1 text-text-faint">Choose a brand above first.</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-5 p-5">
        <h3 className="text-fluid-0 text-text">Current catalog ({makes.length} brands)</h3>
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
                    onClick={() => void removeMake(make.id)}
                    className="text-text-faint hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {make.models.length === 0 && <li className="text-fluid--1 text-text-faint">No models yet.</li>}
                  {make.models.map((model) => (
                    <li
                      key={model.id}
                      className="flex items-center justify-between gap-2 text-fluid--1 text-text-muted"
                    >
                      {model.name}
                      <button
                        type="button"
                        aria-label={`Remove ${model.name}`}
                        onClick={() => void removeModel(model.id)}
                        className="text-text-faint hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
