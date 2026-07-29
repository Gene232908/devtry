"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, MessageCircle, Phone, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLeads } from "@/lib/admin/leads-store";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { mockLeadEvents, Lead, LeadStatus } from "@/config/mock-data";
import {
  DETAIL_STATUS_OPTIONS,
  formatDate,
  formatPhoneDisplay,
  requiresEstimatedValue,
  STATUS_HINT,
  STATUS_LABEL,
} from "@/lib/format";
import { whatsappLink } from "@/config/brand";

// Forward moves only. "New" and "Pending" are both reached automatically —
// New on submission, Pending the moment this page renders — so neither is
// offered as a choice; a lead cannot go back to "nobody has looked at this".
const STATUS_OPTIONS = DETAIL_STATUS_OPTIONS.map((s) => ({
  label: STATUS_LABEL[s],
  value: s,
  hint: STATUS_HINT[s],
}));

const SELECTABLE = new Set<string>(DETAIL_STATUS_OPTIONS);

type Draft = { status: LeadStatus; notes: string; value: string };

function draftFromLead(lead: Lead): Draft {
  return {
    // A lead being viewed is by definition no longer New.
    status: lead.status === "new" ? "pending" : lead.status,
    notes: lead.notes ?? "",
    value: lead.estimatedValueAed != null ? String(lead.estimatedValueAed) : "",
  };
}

export function LeadDetail({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();

  // Edits live here until Save. Nothing on this page writes through on blur —
  // a half-typed value or a mis-clicked status must not reach the database.
  const [draft, setDraft] = useState<Draft>(() => draftFromLead(lead));
  const [saved, setSaved] = useState<Draft>(() => draftFromLead(lead));
  const [errors, setErrors] = useState<{ status?: string; notes?: string; value?: string }>({});
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [spamOpen, setSpamOpen] = useState(false);
  const [spamReason, setSpamReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  const dirty = useMemo(
    () => draft.status !== saved.status || draft.notes !== saved.notes || draft.value !== saved.value,
    [draft, saved],
  );

  const guard = useUnsavedGuard(dirty);

  // Clears the transient "Saved" label if the page unmounts before it expires.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  // Opening the lead is the act of picking it up, so New becomes Pending right
  // away and persists — this is the one field on the page that saves itself,
  // because it records that the lead was seen rather than anything typed.
  const promotedRef = useRef(false);
  useEffect(() => {
    if (promotedRef.current || lead.status !== "new") return;
    promotedRef.current = true;
    void updateLead(lead.id, { status: "pending" });
  }, [lead.id, lead.status, updateLead]);

  const valueRequired = requiresEstimatedValue(draft.status);

  function validate(): boolean {
    const next: typeof errors = {};

    if (!draft.status) next.status = "Choose a status.";
    if (!draft.notes.trim()) next.notes = "Notes are required before saving.";

    if (valueRequired) {
      const parsed = Number(draft.value);
      if (!draft.value.trim()) {
        next.value = "Estimated value is required for this status.";
      } else if (!Number.isFinite(parsed) || parsed <= 0) {
        next.value = "Enter a valid amount.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    const ok = await updateLead(lead.id, {
      status: draft.status,
      notes: draft.notes,
      // Cleared when the status means no sale happened, so a stale figure never
      // lingers on a lead that ended without one.
      estimatedValueAed: valueRequired ? Number(draft.value) : null,
    });

    setSaving(false);

    if (!ok) {
      setSaveError("Couldn't save to the database. Your changes are still here — please try again.");
      return;
    }

    setSaved(draft);
    setErrors({});
    setJustSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 2200);
  }

  /**
   * Marking spam does two things, and the blocklist entry is the one that
   * actually protects the account: every OTP that reaches WhatsApp is billed,
   * so flagging the lead alone would leave the same number free to keep
   * requesting codes. /api/otp/send refuses blocked numbers before contacting
   * Meta, so from here on this sender costs nothing.
   */
  async function confirmSpam() {
    const reason = spamReason.trim();
    if (!reason) return;

    setBlocking(true);
    try {
      await fetch("/api/admin/blocked-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: lead.phoneE164,
          reason: "manual_spam",
          fullName: lead.fullName,
          note: reason,
          sourceLeadId: lead.id,
        }),
      });
    } catch {
      // Non-fatal: still flag the lead below so the admin sees it took effect.
    } finally {
      setBlocking(false);
    }

    // Keep the reason on the lead too, so the timeline explains the block.
    const notes = `${draft.notes}\nMarked as spam: ${reason}`.trim();
    // The API closes the lead automatically when is_spam flips to true.
    const ok = await updateLead(lead.id, { isSpam: true, notes });

    if (!ok) {
      // The number is already blocked at this point — say so rather than
      // implying nothing happened.
      setSaveError("The number was blocked, but the lead could not be updated. Please try again.");
      setSpamOpen(false);
      return;
    }

    const next: Draft = { ...draft, notes, status: "closed" };
    setDraft(next);
    setSaved(next);
    setSpamOpen(false);
    setSpamReason("");
  }

  const events = mockLeadEvents[lead.id] ?? [
    { id: "auto", type: "lead_created", message: "Lead submitted via website valuation form.", createdAt: lead.createdAt },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/leads" className="flex items-center gap-2 text-fluid--1 text-text-muted hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-fluid-3 text-text">{lead.fullName}</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">Submitted {formatDate(lead.createdAt)}</p>
        </div>
        <StatusPill status={lead.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-fluid-0 text-text">Vehicle</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-fluid--1 sm:grid-cols-4">
              <Detail label="Make" value={lead.make} />
              <Detail label="Model" value={lead.model} />
              <Detail label="Trim" value={lead.trim || "—"} />
              <Detail label="Year" value={String(lead.year)} />
              <Detail label="Mileage" value={`${lead.mileageKm.toLocaleString()} km`} />
              <Detail
                label="Option Level"
                value={lead.optionLevel ?? (lead.condition ? lead.condition.charAt(0).toUpperCase() + lead.condition.slice(1) : "—")}
              />
              <Detail label="Location" value={lead.location || "—"} />
              <Detail label="Phone" value={formatPhoneDisplay(lead.phoneE164)} />
              <Detail label="Email" value={lead.email || "—"} />
              <Detail label="Source" value="Web" />
            </div>
            {lead.description ? (
              <div className="border-t border-border pt-4">
                <p className="text-text-faint">Seller&apos;s description</p>
                <p className="mt-1.5 text-fluid--1 font-light leading-6 text-text">{lead.description}</p>
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
              placeholder="What happened with this lead? Required before saving."
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

          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-fluid-0 text-text">Activity</h3>
            <ul className="flex flex-col gap-3">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-fluid--1">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="text-text">{ev.message}</p>
                    <p className="text-text-faint">{formatDate(ev.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-5">
            <h3 className="text-fluid-0 text-text">Contact customer</h3>
            <a
              href={whatsappLink(
                `Hi ${lead.fullName.split(" ")[0]}, regarding your ${lead.year} ${lead.make} ${lead.model} valuation with CarVibe Dubai…`,
                lead.phoneE164,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full">
                <MessageCircle className="h-4 w-4" /> Message on WhatsApp
              </Button>
            </a>
            <a href={`tel:${lead.phoneE164}`}>
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4" /> Call {formatPhoneDisplay(lead.phoneE164)}
              </Button>
            </a>
            <p className="text-fluid--1 text-text-faint">
              WhatsApp opens the chat pre-filled — use the call icon inside WhatsApp for a voice/video call.
            </p>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-fluid-0 text-text">Status &amp; value</h3>

            {/* The current status shows as the placeholder while it is one of
                the automatic states (New/Pending), so the field still reads
                correctly while only offering forward moves. */}
            <Select
              label="Status *"
              placeholder={STATUS_LABEL[draft.status] ?? "Select"}
              options={STATUS_OPTIONS}
              value={SELECTABLE.has(draft.status) ? draft.status : ""}
              error={errors.status}
              onChange={(v) => setDraft((d) => ({ ...d, status: v as LeadStatus }))}
            />
            <Input
              label={valueRequired ? "Estimated Value (AED) *" : "Estimated Value (AED)"}
              inputMode="numeric"
              value={draft.value}
              error={errors.value}
              disabled={!valueRequired}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              placeholder={valueRequired ? "e.g. 185000" : "Not needed for a closed lead"}
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
            {saveError && (
              <p className="-mt-1 text-fluid--1 text-danger" role="alert">
                {saveError}
              </p>
            )}

            <div className="border-t border-border pt-4">
              <Button
                variant="outline"
                className="w-full text-danger hover:bg-danger/10"
                disabled={blocking || lead.isSpam === true}
                onClick={() => setSpamOpen(true)}
              >
                <Ban className="h-4 w-4" />
                {lead.isSpam === true ? "Marked as spam" : "Mark as spam"}
              </Button>
              <p className="mt-2 text-fluid--1 text-text-faint">
                Also blocks {formatPhoneDisplay(lead.phoneE164)} from requesting new verification codes. Undo it from{" "}
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
        open={spamOpen}
        tone="danger"
        title="Mark this lead as spam?"
        description={
          <>
            This closes the lead and blocks <span className="text-text">{formatPhoneDisplay(lead.phoneE164)}</span> from
            requesting any further verification codes. A reason is required so the block can be explained later.
          </>
        }
        confirmLabel="Mark as spam"
        cancelLabel="Cancel"
        busy={blocking}
        confirmDisabled={spamReason.trim().length === 0}
        onConfirm={() => void confirmSpam()}
        onCancel={() => {
          setSpamOpen(false);
          setSpamReason("");
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">
            Reason <span className="text-danger">*</span>
          </span>
          <textarea
            value={spamReason}
            onChange={(e) => setSpamReason(e.target.value)}
            rows={3}
            placeholder="e.g. Repeated fake submissions, number not reachable."
            className="w-full rounded-card border border-border bg-surface-2 p-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={guard.pendingHref !== null}
        tone="danger"
        title="Leave without saving?"
        description="Your changes to this lead have not been saved yet. If you leave now they will be lost — go back and press Save to keep them."
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
