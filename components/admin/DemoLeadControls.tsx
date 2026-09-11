"use client";

import { useEffect, useState } from "react";
import { Database, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLeads } from "@/lib/admin/leads-store";
import { useStaffIdentity } from "@/lib/admin/staff-identity-context";

type DemoStatus = "loading" | "available" | "active" | "deleted" | "error";

export function DemoLeadControls() {
  const identity = useStaffIdentity();
  const router = useRouter();
  const { refresh } = useLeads();
  const [status, setStatus] = useState<DemoStatus>("loading");
  const [leadCount, setLeadCount] = useState(0);
  const [busy, setBusy] = useState<"create" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = identity?.role === "admin" || identity?.role === "manager";

  async function loadStatus() {
    const res = await fetch("/api/admin/demo-leads", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) throw new Error(body?.error?.message ?? "Could not load demo controls.");
    setStatus(body.data.status as DemoStatus);
    setLeadCount(Number(body.data.leadCount) || 0);
  }

  useEffect(() => {
    if (!isOwner) return;
    void loadStatus().catch((e: unknown) => {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not load demo controls.");
    });
  }, [isOwner]);

  async function createDemoLeads() {
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/admin/demo-leads", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error?.message ?? "Could not create demo leads.");
      setStatus("active");
      setLeadCount(Number(body.data.leadCount) || 560);
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create demo leads.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteDemoLeads() {
    if (!window.confirm("Delete the 40 demonstration leads? Existing non-demo leads will not be touched.")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch("/api/admin/demo-leads", { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error?.message ?? "Could not delete demo leads.");
      setStatus("deleted");
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete demo leads.");
    } finally {
      setBusy(null);
    }
  }

  if (!isOwner || status === "loading" || status === "deleted") return null;

  if (status === "error") {
    return <span className="text-fluid--1 text-danger" role="alert">{error ?? "Demo controls are unavailable."}</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "available" && (
        <Button variant="outline" size="sm" onClick={() => void createDemoLeads()} disabled={busy !== null}>
          <Database className="h-4 w-4" /> {busy === "create" ? "Creating 560 leads..." : "Create Demo Leads"}
        </Button>
      )}
      {status === "active" && (
        <>
          {leadCount < 560 && (
            <Button variant="outline" size="sm" onClick={() => void createDemoLeads()} disabled={busy !== null}>
              <Database className="h-4 w-4" /> {busy === "create" ? "Completing 560 leads..." : `Complete Demo Leads (${leadCount}/560)`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void deleteDemoLeads()} disabled={busy !== null}>
            <Trash2 className="h-4 w-4" /> {busy === "delete" ? "Deleting demo leads..." : "Delete Demo Leads"}
          </Button>
        </>
      )}
      {error && <span className="text-fluid--1 text-danger" role="alert">{error}</span>}
    </div>
  );
}
