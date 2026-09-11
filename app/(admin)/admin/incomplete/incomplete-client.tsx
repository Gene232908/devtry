"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Trash2, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFreshServerData, useServerState } from "@/lib/admin/use-fresh-server-data";
import { type PartialLead } from "@/lib/admin/partial-lead";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
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

/**
 * `initialRows` is fetched by the server in `page.tsx`, so the table is present
 * on first frame rather than after a client fetch that had to pass back through
 * middleware. `load()` still serves Refresh and the reload after a delete/block.
 */
export default function IncompleteValuationsClient({
  initialRows,
  initialError,
}: {
  initialRows: PartialLead[];
  initialError: string | null;
}) {
  // Without this the page can show a payload rendered before these captures
  // existed — which is exactly what happened: an empty table while two forms
  // sat in the database.
  useFreshServerData();

  const router = useRouter();
  const searchParams = useSearchParams();
  const attention = searchParams.get("attention");
  const isAttention = attention === "incomplete";

  const [rows, setRows] = useServerState<PartialLead[]>(initialRows);
  const [error, setError] = useState<string | null>(initialError);
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

  // No client-side loader. The list comes from the server render and re-reads
  // itself there — on arrival, on focus, and on a timer while visible. A second
  // fetch over /api/admin/partial-leads would be a second source of truth that
  // could disagree with the first, which is exactly how the Inventory sale
  // ended up racing itself.

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
    // Header, spacing, card padding and table rhythm all mirror the Leads
    // Directory — these are sibling pages in the same dashboard.
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Incomplete Valuation Form</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          Visitors who started a valuation and left before submitting. Numbers here are not verified.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      {isAttention && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-400">
              <UsersRound className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Follow-up Action Active
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                  {rows.length} {rows.length === 1 ? "form" : "forms"} found
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                Incomplete Valuation Forms
              </p>
              <p className="text-xs text-gray-300">
                People who started the valuation form but did not finish it. Contact them to recover the lead.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.replace("/admin/incomplete")}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
            Clear attention banner
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">No incomplete forms right now.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Anyone who abandons the valuation form after entering their number will appear here.
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-fluid--1 text-text-muted">
              {rows.length} incomplete {rows.length === 1 ? "form" : "forms"}
            </p>
            {/* The Refresh button is gone. This list re-reads itself on arrival,
                whenever the tab regains focus, and every 20 seconds while it is
                on screen — so the button could only ever repeat work that had
                just happened, while teaching people not to trust the list
                without pressing it first. */}
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-fluid--1">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="py-2 pr-4 font-normal">Client Name</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-1 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/incomplete/${row.id}`} className="text-text hover:text-gold">
                        {row.full_name || "Unnamed contact"}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={row.status as LeadStatus} />
                    </td>
                    <td className="py-3 pl-2 pr-1">
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
          </div>
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
