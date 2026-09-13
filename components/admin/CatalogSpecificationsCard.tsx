"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Specification = { id: string; name: string };

export function CatalogSpecificationsCard() {
  const [items, setItems] = useState<Specification[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/catalog/specifications", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Couldn't load specifications.");
    setItems(body.data.specifications);
  }, []);

  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)); }, [load]);

  async function add() {
    const value = name.trim();
    if (!value) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/admin/catalog/specifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Couldn't add that specification.");
      setName(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't add that specification."); }
    finally { setBusy(false); }
  }

  async function remove(item: Specification) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/catalog/specifications/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Couldn't remove that specification.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't remove that specification."); }
    finally { setBusy(false); }
  }

  return (
    <Card className="p-4">
      <h2 className="text-base font-semibold text-text">Specifications</h2>
      <p className="mt-1 text-fluid--1 text-text-muted">These required options appear beside Mileage in the public valuation form.</p>
      {error && <p className="mt-3 text-fluid--1 text-danger" role="alert">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length === 0 ? <p className="text-fluid--1 text-text-faint">No live specifications yet.</p> : items.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 py-1 pl-3 pr-1 text-fluid--1 text-text">
            {item.name}
            <button type="button" disabled={busy} onClick={() => void remove(item)} aria-label={`Remove ${item.name}`} className="rounded-full p-1 text-text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void add()} maxLength={80} placeholder="e.g. GCC Specs" className="h-10 min-w-0 flex-1 rounded-card border border-border bg-surface-2 px-3 text-fluid--1 text-text outline-none focus:border-gold" />
        <Button onClick={() => void add()} disabled={busy || !name.trim()} className="shrink-0"><Plus className="h-4 w-4" /> Add</Button>
      </div>
    </Card>
  );
}
