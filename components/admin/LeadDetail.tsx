"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Lock, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MarkSpamAction } from "@/components/admin/MarkSpamAction";
import { useLeads } from "@/lib/admin/leads-store";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { mockLeadEvents, Lead, LeadStatus } from "@/config/mock-data";
import { type Draft, draftFromLead } from "@/lib/admin/lead-draft";
import {
  DETAIL_STATUS_OPTIONS,
  formatAed,
  formatDate,
  formatScheduledInspection,
  requiresPurchasePrice,
  STATUS_HINT,
  STATUS_LABEL,
} from "@/lib/format";
import { type LeadEvent, type LeadViewSummary } from "@/lib/admin/lead-events";
import { INVENTORY_STATUS_LABEL, type InventoryItem } from "@/lib/admin/inventory";
import { useStaffOptions } from "@/lib/admin/use-staff-options";
import { LeadAssignment } from "@/components/admin/LeadAssignment";
import { LeadActivityCard } from "@/components/admin/LeadActivityCard";
import { LeadVehicleCard } from "@/components/admin/LeadVehicleCard";
import { LeadContactCard } from "@/components/admin/LeadContactCard";
import { useStaffIdentity } from "@/lib/admin/staff-identity-context";
import { hasCapability } from "@/lib/auth/permissions";
import { statusChoicesForRole } from "@/lib/auth/lead-visibility";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoInventory } from "@/config/demo-admin-data";

const SELECTABLE = new Set<string>(DETAIL_STATUS_OPTIONS);

const FALLBACK_EVENTS = (createdAt: string): LeadEvent[] => [
  { id: "auto", type: "lead_created", message: "Lead submitted via website valuation form.", createdAt },
];

export function LeadDetail({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();
  const { staffOptions, canAssign, loading: staffLoading } = useStaffOptions();
  const identity = useStaffIdentity();
  const canViewContact = !identity || hasCapability(identity, "viewLeadContact");
  const router = useRouter();
  const isPurchaser = identity?.role === "purchaser";

  const roleStatusOptions = useMemo(() => {
    const allowed = statusChoicesForRole(identity?.role) ?? DETAIL_STATUS_OPTIONS;
    return allowed.map((s) => ({
      label: STATUS_LABEL[s],
      value: s,
      hint: STATUS_HINT[s],
    }));
  }, [identity]);

  const [draft, setDraft] = useState<Draft>(() => draftFromLead(lead));
  const [saved, setSaved] = useState<Draft>(() => draftFromLead(lead));
  const [errors, setErrors] = useState<{ status?: string; notes?: string; purchasePrice?: string; inspectionScheduledAt?: string }>({});
  const [car, setCar] = useState<InventoryItem | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [events, setEvents] = useState<LeadEvent[]>(() => FALLBACK_EVENTS(lead.createdAt));
  const [views, setViews] = useState<LeadViewSummary>({ count: 0, lastAt: null });

  const dirty = useMemo(
    () =>
      draft.status !== saved.status ||
      draft.notes !== saved.notes ||
      draft.purchasePrice !== saved.purchasePrice ||
      draft.purchasedAt !== saved.purchasedAt ||
      draft.inspectionScheduledAt !== saved.inspectionScheduledAt,
    [draft, saved],
  );

  const guard = useUnsavedGuard(dirty);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const loadCar = useCallback(async () => {
    if (ADMIN_PREVIEW) {
      setCar(demoInventory.find((i) => i.leadId === lead.id) ?? null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/inventory?leadId=${encodeURIComponent(lead.id)}`, { cache: "no-store" });
      const body = await res.json();
      if (res.ok && body.ok) setCar(body.data.items[0] ?? null);
    } catch {
      // Non-fatal
    }
  }, [lead.id]);

  useEffect(() => {
    void loadCar();
  }, [loadCar]);

  const fetchTimeline = useCallback(async () => {
    if (ADMIN_PREVIEW) {
      setEvents(mockLeadEvents[lead.id] ?? FALLBACK_EVENTS(lead.createdAt));
      setViews({ count: 0, lastAt: null });
      return;
    }

    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/events`, { cache: "no-store" });
      const body = await res.json();
      if (res.ok && body.ok) {
        setEvents(body.data.events);
        setViews(body.data.views);
      }
    } catch {
      // Leaves fallback in place
    }
  }, [lead.id, lead.createdAt]);

  const viewLoggedRef = useRef(false);
  useEffect(() => {
    if (viewLoggedRef.current) return;
    viewLoggedRef.current = true;

    void fetchTimeline();
    if (!ADMIN_PREVIEW) void (async () => {
      try {
        const response = await fetch(`/api/admin/leads/${lead.id}/events`, { method: "POST" });
        const body = await response.json();
        if (response.ok && body.ok && body.data.recorded) await fetchTimeline();
      } catch {
        // Best-effort
      }
    })();
  }, [lead.id, fetchTimeline]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (!car || seededRef.current) return;
    seededRef.current = true;

    const purchase = {
      purchasePrice: String(car.purchasePriceAed),
      purchasedAt: car.purchasedAt.slice(0, 10),
    };

    setDraft((d) => ({ ...d, ...purchase }));
    setSaved((s) => ({ ...s, ...purchase }));
  }, [car]);

  const scheduledInspectionAt = draft.inspectionScheduledAt || lead.inspectionScheduledAt || null;
  const priceRequired = requiresPurchasePrice(draft.status);
  const priceLocked = car?.status === "sold";
  const dealLocked = lead.status === "deal" && Boolean(car);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!draft.status) next.status = "Choose a status.";
    if (!draft.notes.trim()) next.notes = "Add a short note explaining what happened.";

    if (!isPurchaser && draft.status === "inspection_scheduled") {
      if (!draft.inspectionScheduledAt.trim()) {
        next.inspectionScheduledAt = "Choose a date and time for the inspection.";
      } else {
        const time = new Date(draft.inspectionScheduledAt).getTime();
        if (Number.isNaN(time)) next.inspectionScheduledAt = "Choose a valid date and time.";
      }
    }

    if (priceRequired && !priceLocked) {
      const parsed = Number(draft.purchasePrice);
      if (!draft.purchasePrice.trim()) {
        next.purchasePrice = "Enter what you actually paid for this car.";
      } else if (!Number.isFinite(parsed) || parsed <= 0) {
        next.purchasePrice = "Enter a valid amount.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    const recordingPurchase = priceRequired && !priceLocked;

    const ok = await updateLead(lead.id, {
      status: draft.status,
      notes: draft.notes,
      ...(isPurchaser
        ? {}
        : {
            inspectionScheduledAt: draft.inspectionScheduledAt
              ? new Date(draft.inspectionScheduledAt).toISOString()
              : null,
          }),
      ...(recordingPurchase
        ? {
            purchasePriceAed: Number(draft.purchasePrice),
            purchasedAt: new Date(draft.purchasedAt).toISOString(),
          }
        : {}),
    });

    setSaving(false);

    if (!ok) {
      setSaveError("Couldn't save to the database. Your changes are still here — please try again.");
      return;
    }

    if (recordingPurchase) void loadCar();
    router.refresh();
    void fetchTimeline();

    setSaved(draft);
    setErrors({});
    setJustSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 2200);
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Breadcrumb */}
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-gold transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      {/* Header: Customer Name, Status, Date */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text tracking-tight">
            {lead.fullName || "Customer"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Submitted {formatDate(lead.createdAt)}
            {lead.location ? ` · ${lead.location}` : ""}
            {" · Web Lead"}
          </p>
        </div>
        <div>
          <StatusPill status={lead.status} />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] items-start">
        {/* LEFT COLUMN: Vehicle Details, Customer Contact, Activity */}
        <div className="flex flex-col gap-6 min-w-0">
          <LeadVehicleCard lead={lead} />

          {/* Customer Contact */}
          {canViewContact && (
            <LeadContactCard
              fullName={lead.fullName}
              phoneE164={lead.phoneE164}
              carSummary={`${lead.year} ${lead.make} ${lead.model}`}
            />
          )}

          {/* Activity & Notes History */}
          <LeadActivityCard events={events} views={views} />
        </div>

        {/* RIGHT COLUMN: Assigned Team & Status / Notes Disposition */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Assigned Team */}
          {!staffLoading && (
            <LeadAssignment
              assignment={{
                callCenterId: lead.callCenterId ?? null,
                purchaserId: lead.purchaserId ?? null,
              }}
              staffOptions={staffOptions}
              leadId={lead.id}
              canAssign={canAssign}
            />
          )}

          {/* Status & Notes (Unified Call Update) */}
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-base font-semibold text-text">Status &amp; Notes</h3>

            {dealLocked ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-text-faint">Status</span>
                <div className="flex h-11 items-center justify-between gap-3 rounded-card border border-gold/40 bg-gold/5 px-4">
                  <span className="text-sm font-medium text-gold">{STATUS_LABEL[lead.status]}</span>
                  <Lock className="h-4 w-4 shrink-0 text-text-muted" />
                </div>
                <span className="text-xs text-text-muted">
                  This car is in Inventory. Withdraw it there if the purchase did not go ahead.
                </span>
              </div>
            ) : (
              <Select
                label="Status *"
                placeholder={STATUS_LABEL[draft.status] ?? "Select"}
                options={roleStatusOptions}
                value={SELECTABLE.has(draft.status) ? draft.status : ""}
                error={errors.status}
                onChange={(v) => setDraft((d) => ({ ...d, status: v as LeadStatus }))}
              />
            )}

            {/* Scheduled Inspection Picker (Agents & Admin only when scheduling) */}
            {!isPurchaser && draft.status === "inspection_scheduled" && (
              <Input
                label="Scheduled Inspection Date & Time *"
                type="datetime-local"
                value={draft.inspectionScheduledAt}
                error={errors.inspectionScheduledAt}
                onChange={(e) => setDraft((d) => ({ ...d, inspectionScheduledAt: e.target.value }))}
              />
            )}

            {scheduledInspectionAt && (
              <div className="flex flex-col gap-1 rounded-card border border-gold/40 bg-gold/5 p-4">
                <div className="flex items-center gap-2 font-medium text-gold text-sm">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Scheduled Inspection</span>
                </div>
                <p className="text-sm font-semibold text-text">
                  {formatScheduledInspection(scheduledInspectionAt)}
                </p>
                <p className="text-xs text-text-muted">
                  Customer scheduled to visit facility for car inspection and negotiation.
                </p>
              </div>
            )}

            {priceRequired && (
              <>
                <Input
                  label="Purchase Price (AED) *"
                  inputMode="numeric"
                  value={draft.purchasePrice}
                  error={errors.purchasePrice}
                  disabled={priceLocked}
                  onChange={(e) => setDraft((d) => ({ ...d, purchasePrice: e.target.value }))}
                  placeholder="e.g. 185000"
                />
                <Input
                  label="Purchase date"
                  type="date"
                  value={draft.purchasedAt}
                  disabled={priceLocked}
                  onChange={(e) => setDraft((d) => ({ ...d, purchasedAt: e.target.value }))}
                />
                <p className="-mt-1 text-xs text-text-faint">
                  {priceLocked
                    ? "This car has been sold, so the price it was bought for can no longer be changed."
                    : "Exactly what you paid the customer. Saving adds this car to your Inventory."}
                </p>
              </>
            )}

            {car && (
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between gap-3 rounded-card border border-border px-3 py-2.5 text-sm hover:border-gold/50 transition-colors"
              >
                <span className="text-text-muted">
                  In Inventory · <span className="text-text">{INVENTORY_STATUS_LABEL[car.status]}</span>
                </span>
                <span className="text-gold font-medium">{formatAed(car.purchasePriceAed)}</span>
              </Link>
            )}

            {/* The current note is editable here; every saved version is kept
                separately in Activity as the permanent follow-up history. */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Follow-up note <span className="text-danger">*</span>
                </label>
                {dirty && <span className="text-xs font-medium text-warning">Unsaved changes</span>}
              </div>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                rows={4}
                placeholder="What happened with this lead? Required before saving."
                className={`w-full rounded-card border bg-surface-2 p-3 text-sm text-text outline-none focus:gold-glow focus:border-gold ${
                  errors.notes ? "border-danger" : "border-border"
                }`}
              />
              {errors.notes && (
                <p className="text-xs text-danger" role="alert">
                  {errors.notes}
                </p>
              )}
              <p className="text-xs text-text-faint">
                Saving keeps this as the latest note and records this version in Activity.
              </p>
            </div>

            {/* Save Button */}
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
              <p className="-mt-1 text-xs text-danger" role="alert">
                {saveError}
              </p>
            )}

            <MarkSpamAction
              lead={lead}
              notes={draft.notes}
              onMarked={(notes) => {
                const next: Draft = { ...draft, notes, status: "closed" };
                setDraft(next);
                setSaved(next);
              }}
              onError={setSaveError}
            />
          </Card>
        </div>
      </div>

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
