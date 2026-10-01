"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { useLeads } from "@/lib/admin/leads-store";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import {
  formatPartialDate,
  partialInquiryType,
  partialCarSummary,
  PARTIAL_STATUSES,
  type PartialLead,
} from "@/lib/admin/partial-lead";
import { STATUS_HINT, STATUS_LABEL } from "@/lib/format";
import { LeadStatus } from "@/config/mock-data";
import { useStaffOptions } from "@/lib/admin/use-staff-options";
import { LeadAssignment } from "@/components/admin/LeadAssignment";
import { LeadContactCard } from "@/components/admin/LeadContactCard";
import { PartialLeadCapturedCard } from "@/components/admin/PartialLeadCapturedCard";
import { PartialLeadActivityCard } from "@/components/admin/PartialLeadActivityCard";
import {
  PartialLeadConversionFields,
  type PartialDealErrors,
  type PartialDealState,
} from "@/components/admin/PartialLeadConversionFields";
import { modelsFor, trimsFor, useVehicleCatalog } from "@/lib/use-vehicle-catalog";
import { AREAS_BY_EMIRATE } from "@/config/emirates-areas";

const STATUS_OPTIONS = PARTIAL_STATUSES.map((s) => ({
  label: STATUS_LABEL[s],
  value: s,
  hint: STATUS_HINT[s],
}));

const SELECTABLE = new Set<string>(PARTIAL_STATUSES);

type Draft = { status: string; notes: string };
type PendingAction = "block" | "delete";

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextDayDateTimeInput(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export function PartialLeadDetail({ partial }: { partial: PartialLead }) {
  const router = useRouter();
  const { refresh: refreshLeads } = useLeads();
  const { staffOptions, loading: staffLoading } = useStaffOptions();
  const { makes, specifications } = useVehicleCatalog();
  const isScrap = partialInquiryType(partial) === "scrap";

  const initialStatus = partial.status;
  const [draft, setDraft] = useState<Draft>({ status: initialStatus, notes: partial.notes ?? "" });
  const [saved, setSaved] = useState<Draft>({ status: initialStatus, notes: partial.notes ?? "" });
  const [errors, setErrors] = useState<PartialDealErrors>({});

  const isDeal = false;
  const isInspectionScheduled = draft.status === "inspection_scheduled";
  const isConversion = isInspectionScheduled;

  const [deal, setDeal] = useState<PartialDealState>({
    purchasePrice: "",
    purchasedAt: todayInputValue(),
    fullName: partial.full_name ?? "",
    make: partial.make ?? "",
    model: partial.model ?? "",
    year: partial.year ? String(partial.year) : "",
    trim: "",
    mileageKm: partial.mileage_value != null ? String(partial.mileage_value) : (partial.mileage_km ? String(partial.mileage_km) : ""),
    mileageUnit: partial.mileage_unit === "miles" ? "miles" : "km",
    specification: partial.specification ?? "",
    emirate: "",
    inspectionScheduledAt: nextDayDateTimeInput(),
    markVerified: false,
    scrapCondition: partial.scrap_condition ?? "",
    scrapAskingPriceAed: partial.scrap_asking_price_aed != null ? String(partial.scrap_asking_price_aed) : "",
  });

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const activities = partial.activities ?? [];

  const makeOptions = useMemo(() => makes.map((make) => ({ label: make.name, value: make.name })), [makes]);
  const modelOptions = useMemo(
    () => modelsFor(makes, deal.make).map((model) => ({ label: model.name, value: model.name })),
    [makes, deal.make],
  );
  const trimOptions = useMemo(
    () => trimsFor(makes, deal.make, deal.model).map((trim) => ({ label: trim, value: trim })),
    [makes, deal.make, deal.model],
  );
  const specificationOptions = useMemo(
    () => specifications.map((specification) => ({ label: specification.name, value: specification.name })),
    [specifications],
  );
  const emirateOptions = useMemo(
    () => Object.keys(AREAS_BY_EMIRATE).map((emirate) => ({ label: emirate, value: emirate })),
    [],
  );

  const [pending, setPending] = useState<PendingAction>("delete");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function ask(action: PendingAction) {
    setPending(action);
    setDialogOpen(true);
  }

  const dirty = useMemo(
    () =>
      draft.status !== saved.status ||
      draft.notes !== saved.notes ||
      (isConversion && deal.specification !== (partial.specification ?? "")),
    [draft, saved, isConversion, deal.specification, partial.specification],
  );

  const guard = useUnsavedGuard(dirty);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  async function save() {
    if (!draft.notes.trim()) {
      setErrors({ notes: "Notes are required before saving." });
      return;
    }

    if (isConversion) {
      const price = Number(deal.purchasePrice);
      const next: PartialDealErrors = {};

      if (isDeal) {
        if (!deal.purchasePrice.trim()) next.purchasePrice = "Enter what you actually paid for this car.";
        else if (!Number.isFinite(price) || price <= 0) next.purchasePrice = "Enter a valid amount.";
      }

      if (!deal.fullName.trim()) next.fullName = "The customer's name is required.";
      const makeIsValid = makes.some((make) => make.name === deal.make);
      const modelIsValid = modelsFor(makes, deal.make).some((model) => model.name === deal.model);
      const trimIsValid = !deal.trim || trimsFor(makes, deal.make, deal.model).includes(deal.trim);
      if (!makeIsValid) next.make = "Select a make from Vehicle Catalog.";
      if (!modelIsValid) next.model = "Select a model for the chosen make.";
      if (!trimIsValid) next.trim = "Choose a trim for the chosen model, or leave it blank.";
      if (!specifications.some((specification) => specification.name === deal.specification)) {
        next.specification = "Select a specification from Vehicle Catalog.";
      }
      if (!Object.prototype.hasOwnProperty.call(AREAS_BY_EMIRATE, deal.emirate)) next.emirate = "Select an inspection emirate.";
      if (isScrap) {
        const askingPrice = Number(deal.scrapAskingPriceAed);
        if (!deal.scrapCondition.trim()) next.scrapCondition = "Confirm the vehicle condition.";
        if (!deal.scrapAskingPriceAed.trim() || !Number.isFinite(askingPrice) || askingPrice < 0) next.scrapAskingPriceAed = "Enter a valid asking price.";
      }

      if (isInspectionScheduled) {
        const scheduledAt = new Date(deal.inspectionScheduledAt);
        if (!deal.inspectionScheduledAt || Number.isNaN(scheduledAt.getTime())) {
          next.inspectionScheduledAt = "Choose a valid inspection date and time.";
        }
      }

      const year = Number(deal.year);
      if (!deal.year.trim()) next.year = "Required.";
      else if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1) {
        next.year = "Enter a valid year.";
      }

      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
    }

    setErrors({});
    setSaving(true);
    setError(null);

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
        body: JSON.stringify(
          isConversion
            ? {
                status: draft.status,
                notes: draft.notes,
                full_name: deal.fullName,
                make: deal.make,
                model: deal.model,
                year: Number(deal.year),
                trim: deal.trim,
                mileage_value: deal.mileageKm ? Number(deal.mileageKm) : undefined,
                mileage_unit: deal.mileageUnit,
                specification: deal.specification,
                emirate: deal.emirate,
                phone_verified: deal.markVerified,
                scrap_condition: isScrap ? deal.scrapCondition : undefined,
                scrap_asking_price_aed: isScrap ? Number(deal.scrapAskingPriceAed) : undefined,
                ...(isDeal
                  ? {
                      purchase_price_aed: Number(deal.purchasePrice),
                      purchased_at: new Date(deal.purchasedAt).toISOString(),
                    }
                  : { inspection_scheduled_at: new Date(deal.inspectionScheduledAt).toISOString() }),
              }
            : { status: draft.status, notes: draft.notes },
        ),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error?.message ?? "Couldn't save. Please try again.");
        return;
      }

      if (isConversion && body.data?.leadId) {
        // LeadsProvider is mounted at the persistent admin layout, so a
        // server-component refresh does not replace its client-side list.
        // Re-read the authorized lead collection before opening the newly
        // converted record so both its detail and the Leads/Scrap directory
        // can find it immediately.
        await refreshLeads();
        router.push(`/admin/leads/${body.data.leadId}`);
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

      const res = await fetch(`/api/admin/partial-leads/${partial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setSaved(draft);
      router.push("/admin/incomplete");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
      setDialogOpen(false);
    }
  }

  const displayName = partial.full_name || "Unnamed contact";

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Breadcrumb */}
      <Link
        href="/admin/incomplete"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-gold transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Back to incomplete forms
      </Link>

      {/* Header: Name, Status, Date */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text tracking-tight">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Captured {formatPartialDate(partial.created_at)} · {isScrap ? "Incomplete Scrap Inquiry" : "Incomplete Valuation"}
          </p>
        </div>
        <div>
          <StatusPill status={status as LeadStatus} />
        </div>
      </div>

      {/* Unverified Phone Alert Banner */}
      <div className="rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
        This number was never verified — the person left before completing the code check.
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Main 2-Column Grid matching LeadDetail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] items-start">
        {/* LEFT COLUMN: Captured Details, Customer Contact, Activity */}
        <div className="flex flex-col gap-6 min-w-0">
          <PartialLeadCapturedCard partial={partial} />

          {/* Customer Contact (No email, direct phone actions) */}
          <LeadContactCard
            fullName={displayName}
            phoneE164={partial.phone_e164}
            carSummary={partialCarSummary(partial)}
          />

          {/* Activity History */}
          <PartialLeadActivityCard createdAt={partial.created_at} activities={activities} />
        </div>

        {/* RIGHT COLUMN: Assigned Team, Status, Conversion & Actions */}
        <div className="flex flex-col gap-6 min-w-0">
          {!staffLoading && (
            <LeadAssignment
              assignment={{
                callCenterId: partial.call_center_id ?? null,
                purchaserId: null,
              }}
              staffOptions={staffOptions}
              showPurchaser={false}
              description="This incomplete form is automatically assigned to Call Centre for follow-up."
            />
          )}

          {/* Follow-up & Disposition Card */}
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-base font-semibold text-text">Follow-up &amp; Actions</h3>

            <Select
              label="Status *"
              placeholder={STATUS_LABEL[draft.status] ?? "Select"}
              options={STATUS_OPTIONS}
              value={SELECTABLE.has(draft.status) ? draft.status : ""}
              onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
            />

            {isConversion && (
              <PartialLeadConversionFields
                deal={deal}
                errors={errors}
                isInspectionScheduled={isInspectionScheduled}
                isDeal={isDeal}
                makeOptions={makeOptions}
                modelOptions={modelOptions}
                trimOptions={trimOptions}
                specificationOptions={specificationOptions}
                emirateOptions={emirateOptions}
                setDeal={setDeal}
                isScrap={isScrap}
              />
            )}

            {/* Notes Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Notes <span className="text-danger">*</span>
                </label>
                {dirty && <span className="text-xs font-medium text-warning">Unsaved changes</span>}
              </div>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                rows={4}
                placeholder="e.g. Called on Tuesday, asked us to try again next week — still deciding."
                className={`w-full rounded-card border bg-surface-2 p-3 text-sm text-text outline-none focus:gold-glow focus:border-gold ${
                  errors.notes ? "border-danger" : "border-border"
                }`}
              />
              {errors.notes && (
                <p className="text-xs text-danger" role="alert">
                  {errors.notes}
                </p>
              )}
            </div>

            {/* Save Button */}
            <Button
              className="w-full"
              onClick={() => void save()}
              disabled={!dirty || saving}
              loading={saving}
              title={
                isInspectionScheduled
                  ? "Create the real lead, schedule the inspection, and assign a Purchaser."
                  : isDeal
                    ? "Create the real lead and record the purchase."
                    : "Nothing on this page is saved until you press this button."
              }
            >
              <Save className="h-4 w-4" />
              {justSaved && !dirty
                ? "Saved"
                : isInspectionScheduled
                  ? "Convert to Lead & Schedule Inspection"
                  : isDeal
                    ? "Convert to Lead & Record Purchase"
                    : "Save changes"}
            </Button>

            {/* Block & Delete Actions */}
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
              <p className="text-xs text-text-muted leading-relaxed">
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
