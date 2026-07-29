"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { type PartialLead } from "@/lib/admin/partial-lead";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoPartialLeads } from "@/config/demo-admin-data";
import { LeadStatus } from "@/config/mock-data";

// Valuation forms that were started but never submitted. These are UNVERIFIED:
// nobody proved the number belongs to them, which is exactly why they are kept
// out of Leads. Anyone who later completes the form disappears from here
// automatically, so a person is never counted in both places.
//
// The table shows the minimum needed to pick a row: name, where it stands, and
// the two destructive actions. Everything else — the number, the car, the
// notes — lives on the detail page, reached by clicking the name. Status is
// READ-ONLY here for the same reason it is in the Leads Directory: changing it
// should be a considered action taken with the record open, not a stray click
// in a list.

type PendingAction = { kind: "delete" | "block"; row: PartialLead };

export default function IncompleteValuationsPage() {
  const [rows, setRows] = useState<PartialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Nothing destructive happens without passing through the dialog first.
  // `pending` deliberately survives the dialog's exit animation: clearing it on
  // close made the closing dialog fall back to the other action's wording for
  // ~160ms, which read as a second, different warning appearing.
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function ask(action: PendingAction) {
    setPending(action);
    setDialogOpen(true);
  }

  const load = useCallback(async () => {
    setError(null);

    // Milestone 2: design preview — rendered from demo rows, never from the
    // database, so real captured numbers stay off a screen whose access rules
    // are still being built.
    if (ADMIN_PREVIEW) {
      setRows(demoPartialLeads);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/partial-leads", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? "Couldn't load incomplete forms.");
        return;
      }
      setRows(body.data.partialLeads ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPending() {
    if (!pending) return;
    const { kind, row } = pending;

    // Milestone 2: nothing is written. The row leaves the list so the flow can
    // be demonstrated, but it returns on refresh and no number is ever blocked.
    if (ADMIN_PREVIEW) {
      setRows((current) => current.filter((r) => r.id !== row.id));
      setDialogOpen(false);
      return;
    }

    setBusyId(row.id);

    try {
      if (kind === "block") {
        await fetch("/api/admin/blocked-numbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: row.phone_e164,
            reason: "manual_spam",
            fullName: row.full_name,
            note: "Blocked from the incomplete valuations list.",
          }),
        });
      }

      // Blocking also clears the entry — it has been dealt with either way.
      const res = await fetch(`/api/admin/partial-leads/${row.id}`, { method: "DELETE" });
      if (res.ok) setRows((current) => current.filter((r) => r.id !== row.id));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
      setDialogOpen(false);
    }
  }

  const pendingName = pending?.row.full_name || "this contact";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-fluid-2 font-light text-text">Incomplete Valuation Form</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Visitors who started a valuation and left before submitting. Numbers here are not verified.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-fluid--1 text-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">No incomplete forms right now.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Anyone who abandons the valuation form after entering their number will appear here.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[520px] border-collapse text-fluid--1">
            <thead>
              <tr className="border-b border-border text-left text-text-faint">
                <th className="px-4 py-3 font-medium">Client Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/incomplete/${row.id}`} className="text-text hover:text-gold">
                      {row.full_name || "Unnamed contact"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.status as LeadStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="px-3 text-danger hover:bg-danger/10"
                        disabled={busyId === row.id}
                        onClick={() => ask({ kind: "block", row })}
                        title="Block this number from requesting more codes"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="px-3"
                        disabled={busyId === row.id}
                        onClick={() => ask({ kind: "delete", row })}
                        title="Remove from this list"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={pending?.kind === "block" ? "Block this number?" : "Delete this entry?"}
        description={
          pending?.kind === "block" ? (
            <>
              <span className="text-text">{pending?.row.phone_e164}</span> will be blocked from requesting any further
              verification codes, and this entry will be removed from the list. You can undo the block later from
              Blocked Numbers.
            </>
          ) : (
            <>
              This permanently deletes the captured details for <span className="text-text">{pendingName}</span>. This
              cannot be undone.
            </>
          )
        }
        confirmLabel={pending?.kind === "block" ? "Block and remove" : "Delete"}
        cancelLabel="Cancel"
        busy={busyId !== null}
        onConfirm={() => void runPending()}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
