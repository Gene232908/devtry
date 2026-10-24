"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  MANUAL_LEAD_SOURCE_LABELS,
  MANUAL_LEAD_SOURCES,
  REFERRAL_TYPES,
  manualLeadSchema,
  type ManualLeadInput,
} from "@/lib/admin/manual-lead-schema";
import { modelsFor, trimsFor, useVehicleCatalog } from "@/lib/use-vehicle-catalog";
import { AREAS_BY_EMIRATE } from "@/config/emirates-areas";
import { useStaffOptions } from "@/lib/admin/use-staff-options";
import { ROLE_LABELS } from "@/lib/auth/permissions";

type Draft = Record<keyof ManualLeadInput, string>;
type FieldErrors = Partial<Record<keyof Draft | "proof", string>>;

const EMPTY_DRAFT: Draft = {
  fullName: "",
  phone: "",
  source: "",
  sourceNote: "",
  referralType: "none",
  referrerStaffId: "",
  referrerClientName: "",
  referralProofNote: "",
  inspectionScheduledAt: "",
  make: "",
  model: "",
  trim: "",
  year: "",
  mileageKm: "",
  specification: "",
  optionLevel: "",
  emirate: "",
  notes: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export function ManualLeadDialog({ open, onClose, onCreated }: Props) {
  const { makes, specifications } = useVehicleCatalog();
  const { staffOptions, loading: staffLoading } = useStaffOptions();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [proof, setProof] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const modelOptions = useMemo(
    () =>
      modelsFor(makes, draft.make)
        .map((model) => ({ label: model.name, value: model.name }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
    [makes, draft.make],
  );
  const trimOptions = useMemo(
    () => trimsFor(makes, draft.make, draft.model).map((trim) => ({ label: trim, value: trim })),
    [makes, draft.make, draft.model],
  );

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  }

  function resetAndClose() {
    if (saving) return;
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setProof(null);
    setMessage(null);
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const parsed = manualLeadSchema.safeParse(draft);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof Draft | undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      document.getElementById(`manual-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    if (parsed.data.referralType !== "none" && !proof) {
      setErrors({ proof: "Upload a screenshot, chat image, or PDF as proof" });
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.set("data", JSON.stringify(parsed.data));
      if (proof) form.set("proof", proof);
      const response = await fetch("/api/admin/leads/manual", {
        method: "POST",
        body: form,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        const serverFields = body?.error?.fields as Record<string, string[] | undefined> | undefined;
        if (serverFields) {
          setErrors(Object.fromEntries(Object.entries(serverFields).map(([key, value]) => [key, value?.[0]])) as FieldErrors);
        }
        throw new Error(body?.error?.message ?? "Couldn't create the lead.");
      }

      await onCreated();
      const suffix = body.data?.isDuplicate
        ? " The phone number matches a lead from the last 30 days and was flagged for review."
        : body.data?.assignedToCallCenter
          ? " It has been assigned to the Call Centre queue."
          : " No active Call Centre account was available, so an owner must assign it.";
      setMessage({ tone: "success", text: `Lead created.${suffix}` });
      setDraft(EMPTY_DRAFT);
      setProof(null);
      setErrors({});
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Couldn't create the lead." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      title="Create manual lead"
      customHeader
      className="relative my-auto flex max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] max-w-3xl flex-col p-0 overflow-hidden"
    >
      {/* Pinned Modal Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-gold/30 px-5 sm:px-6 py-4 bg-bg-elev/95 backdrop-blur-sm">
        <div className="min-w-0 pr-4">
          <h3 className="font-display text-fluid-1 font-bold text-text truncate">Create manual lead</h3>
          <p className="mt-0.5 text-xs text-text-muted leading-tight">
            For customers who contacted the team directly. The system records your account as creator automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAndClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
        {message && (
          <div className={`mb-4 flex gap-2 rounded-card border p-3 text-sm ${message.tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {message.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form id="manual-lead-form" onSubmit={submit} className="space-y-6" noValidate>
          <section>
            <h4 className="mb-3 font-medium text-text">Customer and source</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="manual-fullName" label="Customer name *" value={draft.fullName} onChange={(e) => update("fullName", e.target.value)} error={errors.fullName} />
              <Input id="manual-phone" label="Phone / WhatsApp *" value={draft.phone} onChange={(e) => update("phone", e.target.value)} error={errors.phone} placeholder="+971 50 123 4567" />
              <Select
                name="manual-source"
                label="How they contacted us *"
                value={draft.source}
                onChange={(value) => update("source", value)}
                options={MANUAL_LEAD_SOURCES.map((source) => ({ value: source, label: MANUAL_LEAD_SOURCE_LABELS[source] }))}
                error={errors.source}
              />
              <div className="sm:col-span-2">
                <Input id="manual-sourceNote" label="Source details (optional)" value={draft.sourceNote} onChange={(e) => update("sourceNote", e.target.value)} error={errors.sourceNote} placeholder="Example: Called the office landline" />
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-1 font-medium text-text">Referral (optional)</h4>
            <p className="mb-3 text-sm text-text-muted">The employee who referred the customer is separate from the employee creating this lead.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Referral type"
                value={draft.referralType}
                onChange={(value) => setDraft((current) => ({ ...current, referralType: value, referrerStaffId: "", referrerClientName: "", referralProofNote: "" }))}
                options={REFERRAL_TYPES.map((value) => ({ value, label: value === "none" ? "No referral" : value === "employee" ? "Employee referral" : "Client referral (no incentive)" }))}
                name="manual-referralType"
              />
              {draft.referralType === "employee" && (
                <Select
                  label="Referred by employee *"
                  value={draft.referrerStaffId}
                  onChange={(value) => update("referrerStaffId", value)}
                  options={staffOptions.filter((staff) => staff.isActive).map((staff) => ({ value: staff.id, label: `${staff.name} (${ROLE_LABELS[staff.role]})` }))}
                  disabled={staffLoading}
                  error={errors.referrerStaffId}
                  name="manual-referrerStaffId"
                />
              )}
              {draft.referralType === "client" && (
                <Input id="manual-referrerClientName" label="Client referrer name *" value={draft.referrerClientName} onChange={(e) => update("referrerClientName", e.target.value)} error={errors.referrerClientName} />
              )}
              {draft.referralType !== "none" && (
                <>
                  <div className="sm:col-span-2">
                    <label htmlFor="manual-referralProofNote" className="mb-1.5 block text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">Referral proof/details *</label>
                    <textarea id="manual-referralProofNote" value={draft.referralProofNote} onChange={(e) => update("referralProofNote", e.target.value)} rows={3} className={`w-full resize-y rounded-card border bg-bg/45 px-4 py-3 text-text outline-none focus:border-gold ${errors.referralProofNote ? "border-danger" : "border-border-gold/45"}`} placeholder="Example: Customer confirmed that Purchaser 1 referred them to CarVibeDubai." />
                    {errors.referralProofNote && <p className="mt-1 text-sm text-danger">{errors.referralProofNote}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="manual-proof" className="mb-1.5 block text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">Screenshot/chat proof *</label>
                    <input id="manual-proof" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => { setProof(e.target.files?.[0] ?? null); setErrors((current) => ({ ...current, proof: undefined })); }} className="block w-full rounded-card border border-border-gold/45 bg-bg/45 p-3 text-sm text-text file:mr-3 file:rounded-btn file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:text-text" />
                    <p className="mt-1 text-xs text-text-faint">JPG, PNG, or PDF only; maximum 8 MB. Proof is private.</p>
                    {errors.proof && <p className="mt-1 text-sm text-danger">{errors.proof}</p>}
                  </div>
                </>
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-medium text-text">Vehicle details</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select label="Make *" value={draft.make} onChange={(value) => setDraft((current) => ({ ...current, make: value, model: "", trim: "" }))} options={makes.map((make) => ({ value: make.name, label: make.name }))} error={errors.make} name="manual-make" />
              <Select label="Model *" value={draft.model} onChange={(value) => setDraft((current) => ({ ...current, model: value, trim: "" }))} options={modelOptions} disabled={!draft.make} error={errors.model} name="manual-model" />
              <Select label="Trim *" value={draft.trim} onChange={(value) => update("trim", value)} options={trimOptions} disabled={!draft.model} error={errors.trim} name="manual-trim" />
              <Input id="manual-year" label="Model year *" type="number" inputMode="numeric" value={draft.year} onChange={(e) => update("year", e.target.value)} error={errors.year} />
              <Input id="manual-mileageKm" label="Mileage (km) *" type="number" inputMode="numeric" value={draft.mileageKm} onChange={(e) => update("mileageKm", e.target.value)} error={errors.mileageKm} />
              <Select label="Specification *" value={draft.specification} onChange={(value) => update("specification", value)} options={specifications.map((item) => ({ value: item.name, label: item.name }))} error={errors.specification} name="manual-specification" />
              <Select label="Option level *" value={draft.optionLevel} onChange={(value) => update("optionLevel", value)} options={["Basic Mode", "Mid Mode", "Full Option"].map((value) => ({ value, label: value }))} error={errors.optionLevel} name="manual-optionLevel" />
              <Select label="Emirate *" value={draft.emirate} onChange={(value) => update("emirate", value)} options={Object.keys(AREAS_BY_EMIRATE).map((value) => ({ value, label: value }))} error={errors.emirate} name="manual-emirate" />
            </div>
          </section>

          <section>
            <h4 className="mb-1 font-medium text-text">Inspection booking (optional)</h4>
            <p className="mb-3 text-sm text-text-muted">
              If the customer already confirmed a visit, enter the date and time. The lead will automatically be saved as Inspection Scheduled.
            </p>
            <Input
              id="manual-inspectionScheduledAt"
              label="Inspection date and time"
              type="datetime-local"
              value={draft.inspectionScheduledAt}
              onChange={(e) => update("inspectionScheduledAt", e.target.value)}
              error={errors.inspectionScheduledAt}
            />
          </section>

          <section>
            <label htmlFor="manual-notes" className="mb-1.5 block text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">Initial follow-up note (optional)</label>
            <textarea id="manual-notes" value={draft.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className={`w-full resize-y rounded-card border bg-bg/45 px-4 py-3 text-text outline-none focus:border-gold ${errors.notes ? "border-danger" : "border-border-gold/45"}`} />
            {errors.notes && <p className="mt-1 text-sm text-danger">{errors.notes}</p>}
          </section>
        </form>
      </div>

      {/* Pinned Modal Footer */}
      <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-border-gold/30 bg-bg-elev/95 px-5 sm:px-6 py-3.5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={resetAndClose} disabled={saving}>Cancel</Button>
        <Button type="submit" form="manual-lead-form" loading={saving}>Create lead</Button>
      </div>
    </Dialog>
  );
}
