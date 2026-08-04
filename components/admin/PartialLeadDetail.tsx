"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, MessageCircle, Phone, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import {
  formatPartialDate,
  partialCarSummary,
  PARTIAL_STATUSES,
  PARTIAL_STEP_LABELS,
  PARTIAL_TRIGGER_LABELS,
  type PartialLead,
} from "@/lib/admin/partial-lead";
import { STATUS_HINT, STATUS_LABEL } from "@/lib/format";
import { LeadStatus } from "@/config/mock-data";

// Same options and same wording as Customer Details — an abandoned form runs
// through the same follow-up process as a lead.
const STATUS_OPTIONS = PARTIAL_STATUSES.map((s) => ({
  label: STATUS_LABEL[s],
  value: s,
  hint: STATUS_HINT[s],
}));

const SELECTABLE = new Set<string>(PARTIAL_STATUSES);

type Draft = { status: string; notes: string };
type PendingAction = "block" | "delete";

export function PartialLeadDetail({ partial }: { partial: PartialLead }) {
  const router = useRouter();

  // Opening the record is the act of picking it up, so New becomes Pending —
  // matching how a lead behaves, and why "new" is not a selectable option.
  const initialStatus = partial.status === "new" ? "pending" : partial.status;

  // Edits are held here until Save, exactly as on the lead detail screen —
  // nothing on this page writes through on blur or on change.
  const [draft, setDraft] = useState<Draft>({ status: initialStatus, notes: partial.notes ?? "" });
  const [saved, setSaved] = useState<Draft>({ status: initialStatus, notes: partial.notes ?? "" });
  const [errors, setErrors] = useState<{ notes?: string }>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);

  // `pending` survives the dialog's exit animation on purpose. Clearing it on
  // close made the closing dialog fall back to the other action's wording for
  // ~160ms, which read as a second, different warning appearing.
  const [pending, setPending] = useState<PendingAction>("delete");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function ask(action: PendingAction) {
    setPending(action);
    setDialogOpen(true);
  }

  const dirty = useMemo(
    () => draft.status !== saved.status || draft.notes !== saved.notes,
    [draft, saved],
  );

  const guard = useUnsavedGuard(dirty);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  // Persist the promotion to Pending immediately. This is the one field on the
  // page that saves itself, because it records that the record was opened
  // rather than anything the admin typed.
  const promotedRef = useRef(false);
  useEffect(() => {
    if (promotedRef.current || partial.status !== "new") return;
    promotedRef.current = true;
    setStatus("pending");
    // Milestone 2: shown but not persisted.
    if (ADMIN_PREVIEW) return;
    void fetch(`/api/admin/partial-leads/${partial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    }).catch(() => {
      // Non-fatal: the next explicit Save writes the status anyway.
    });
  }, [partial.id, partial.status]);

  async function save() {
    if (!draft.notes.trim()) {
      setErrors({ notes: "Notes are required before saving." });
      return;
    }

    setErrors({});
    setSaving(true);
    setError(null);

    // Milestone 2: the preview never writes. The screen still behaves normally
    // so the flow can be demonstrated; the change is simply not persisted.
    if (ADMIN_PREVIEW) {
      setSaved(draft);
      setStatus(draft.status);
      setJustSaved(true);
      setSaving(false);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setJustSaved(false), 2200);
      return;
    }

    try {
      const res = await fetch(`/api/admin/partial-leads/${partial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: draft.status, notes: draft.notes }),
      });

      // Surface what the server actually said. Collapsing every failure into
      // "try again" hid the real cause — a rejected status reads identically to
      // a dropped connection, and retrying fixes only one of them.
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error?.message ?? "Couldn't save. Please try again.");
        return;
      }

      setSaved(draft);
      setStatus(draft.status);
      setJustSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setJustSaved(false), 2200);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function runPending() {
    // Milestone 2: nothing is written — no number is blocked, nothing deleted.
    if (ADMIN_PREVIEW) {
      setSaved(draft);
      setDialogOpen(false);
      router.push("/admin/incomplete");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (pending === "block") {
        await fetch("/api/admin/blocked-numbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: partial.phone_e164,
            reason: "manual_spam",
            fullName: partial.full_name,
            note: draft.notes.trim() || "Blocked from an incomplete valuation form.",
          }),
        });
      }

      // Both actions finish with the capture removed — it has been dealt with.
      const res = await fetch(`/api/admin/partial-leads/${partial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      // Cleared so the unsaved-changes guard cannot block the redirect.
      setSaved(draft);
      router.push("/admin/incomplete");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
      setDialogOpen(false);
    }
  }

  const displayName = partial.full_name || "Unnamed contact";
  const waHref = `https://wa.me/${partial.phone_e164.replace(/\D/g, "")}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/incomplete" className="flex items-center gap-2 text-fluid--1 text-text-muted hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Back to incomplete forms
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-fluid-3 text-text">{displayName}</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">Captured {formatPartialDate(partial.created_at)}</p>
        </div>
        <StatusPill status={status as LeadStatus} />
      </div>

      {/* Stated plainly and up front: acting on this record means calling
          someone who never proved the number is theirs. */}
      <div className="rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-fluid--1 text-warning">
        This number was never verified — the person left before completing the code check.
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-fluid-0 text-text">What was captured</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-fluid--1 sm:grid-cols-4">
              <Detail label="Name" value={partial.full_name || "—"} />
              <Detail label="Date Captured" value={formatPartialDate(partial.created_at)} />
              <Detail
                label="Got as far as"
                value={PARTIAL_STEP_LABELS[partial.furthest_step] ?? `Step ${partial.furthest_step}`}
              />
              <Detail
                label="Captured by"
                value={partial.last_trigger ? (PARTIAL_TRIGGER_LABELS[partial.last_trigger] ?? partial.last_trigger) : "—"}
              />
              <Detail label="Car" value={partialCarSummary(partial)} />
              <Detail
                label="Mileage"
                value={partial.mileage_km != null ? `${partial.mileage_km.toLocaleString()} km` : "—"}
              />
            </div>
            {partial.description ? (
              <div className="border-t border-border pt-4">
                <p className="text-text-faint">Seller&apos;s description</p>
                <p className="mt-1.5 text-fluid--1 font-light leading-6 text-text">{partial.description}</p>
              </div>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-fluid-0 text-text">
                Notes <span className="text-danger">*</span>
              </h3>
              {dirty && <span className="text-fluid--1 text-warning">Unsaved changes</span>}
            </div>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={4}
              placeholder="e.g. Called on Tuesday, asked us to try again next week — still deciding."
              className={`w-full rounded-card border bg-surface-2 p-3 text-fluid-0 text-text outline-none focus:gold-glow focus:border-gold ${
                errors.notes ? "border-danger" : "border-border"
              }`}
            />
            {errors.notes && (
              <p className="text-fluid--1 text-danger" role="alert">
                {errors.notes}
              </p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-fluid-0 text-text">Contact</h3>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">
                <MessageCircle className="h-4 w-4" /> Message on WhatsApp
              </Button>
            </a>
            <a href={`tel:${partial.phone_e164}`}>
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4" /> Call
              </Button>
            </a>
            <p className="text-fluid--1 text-text-faint">
              There is no lead record yet — reaching out is the only way this becomes one.
            </p>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-fluid-0 text-text">Follow-up</h3>

            {/* The current status shows as the placeholder when it is one of
                the automatic states (New/Pending), so the field still reads
                correctly while only offering forward moves. */}
            <Select
              label="Status"
              placeholder={STATUS_LABEL[draft.status] ?? "Select"}
              options={STATUS_OPTIONS}
              value={SELECTABLE.has(draft.status) ? draft.status : ""}
              onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
            />

            <Button
              className="w-full"
              onClick={() => void save()}
              disabled={!dirty || saving}
              loading={saving}
              title="Nothing on this page is saved until you press this button."
            >
              <Save className="h-4 w-4" />
              {justSaved && !dirty ? "Saved" : "Save changes"}
            </Button>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                className="w-full text-danger hover:bg-danger/10"
                disabled={busy}
                onClick={() => ask("block")}
              >
                <Ban className="h-4 w-4" /> Block this number
              </Button>
              <Button variant="outline" className="w-full" disabled={busy} onClick={() => ask("delete")}>
                <Trash2 className="h-4 w-4" /> Delete this capture
              </Button>
              <p className="text-fluid--1 text-text-faint">
                Blocking stops this number requesting verification codes. Undo it from{" "}
                <Link href="/admin/blocked" className="text-gold hover:underline">
                  Blocked Numbers
                </Link>
                .
              </p>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={pending === "block" ? "Block this number?" : "Delete this capture?"}
        description={
          pending === "block" ? (
            <>
              <span className="text-text">{partial.phone_e164}</span> will be refused before any WhatsApp message is
              sent, and this capture will be removed. You can undo the block later from Blocked Numbers.
            </>
          ) : (
            <>
              This permanently deletes the captured details for <span className="text-text">{displayName}</span>. This
              cannot be undone.
            </>
          )
        }
        confirmLabel={pending === "block" ? "Block and remove" : "Delete"}
        cancelLabel="Cancel"
        busy={busy}
        onConfirm={() => void runPending()}
        onCancel={() => setDialogOpen(false)}
      />

      <ConfirmDialog
        open={guard.pendingHref !== null}
        tone="danger"
        title="Leave without saving?"
        description="Your changes have not been saved yet. If you leave now they will be lost — go back and press Save to keep them."
        confirmLabel="Leave anyway"
        cancelLabel="Stay on this page"
        onConfirm={guard.leave}
        onCancel={guard.stay}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-text-faint">{label}</p>
      <p className="mt-0.5 break-words text-text">{value}</p>
    </div>
  );
}
