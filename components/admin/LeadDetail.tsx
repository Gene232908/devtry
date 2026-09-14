"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ClipboardCheck, Clock, Lock, Save } from "lucide-react";
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
import { LeadArrivalCard } from "@/components/admin/LeadArrivalCard";
import { LeadScheduledInspectionCard } from "@/components/admin/LeadScheduledInspectionCard";
import { LeadPurchaseFields } from "@/components/admin/LeadPurchaseFields";
import { LeadStartInspectionButton } from "@/components/admin/LeadStartInspectionButton";
import { LeadReferralCard } from "@/components/admin/LeadReferralCard";
import { useStaffIdentity } from "@/lib/admin/staff-identity-context";
import { hasCapability } from "@/lib/auth/permissions";
import { statusChoicesForRole } from "@/lib/auth/lead-visibility";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoInventory } from "@/config/demo-admin-data";

const SELECTABLE = new Set<string>(DETAIL_STATUS_OPTIONS);
const COMPLETED_INSPECTION_STATUSES = new Set<LeadStatus>(["inspected", "negotiating", "deal", "closed"]);

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
  const canViewInspection =
    (isPurchaser || Boolean(identity && hasCapability(identity, "viewAllLeads"))) &&
    COMPLETED_INSPECTION_STATUSES.has(lead.status);
  const canStartInspection = Boolean(identity && hasCapability(identity, "viewAllLeads")) || isPurchaser
    ? lead.status === "inspection_scheduled" && lead.arrivalStatus === "arrived"
    : false;

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
  const [markingArrival, setMarkingArrival] = useState(false);
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
  const canConfirmArrival =
    (identity?.role === "call_center" || identity?.role === "admin" || identity?.role === "manager");
  const arrivalEligible =
    canConfirmArrival &&
    ["inspection_scheduled", "inspected", "negotiating", "deal"].includes(lead.status) &&
    Boolean(lead.purchaserId);
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

  async function confirmArrival() {
    if (!arrivalEligible || lead.arrivalStatus === "arrived") return;
    setMarkingArrival(true);
    setSaveError(null);
    const ok = await updateLead(lead.id, { arrivalStatus: "arrived" });
    setMarkingArrival(false);
    if (!ok) {
      setSaveError("Couldn't confirm customer arrival. Please try again.");
      return;
    }
    router.refresh();
    void fetchTimeline();
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
        <div className="flex flex-wrap items-center gap-3">
          {canViewInspection && (
            <Link
              href={`/admin/leads/${encodeURIComponent(lead.id)}/inspection`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-btn border border-border-gold/70 bg-bg/30 px-4 text-sm font-medium text-text transition-colors hover:border-gold hover:bg-surface-2"
            >
              <ClipboardCheck className="h-4 w-4" />
              View inspection form
            </Link>
          )}
          {lead.arrivalStatus === "arrived" && (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-btn border border-emerald-500/40 bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-400 shadow-sm">
              <Check className="h-4 w-4 text-emerald-400" />
              Customer Arrived
            </span>
          )}
          {lead.status === "inspection_scheduled" && lead.arrivalStatus !== "arrived" && (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-btn border border-amber-500/30 bg-amber-500/10 px-3.5 text-xs font-medium text-amber-300">
              <Clock className="h-4 w-4 text-amber-300" />
              Awaiting Arrival
            </span>
          )}
          {!canStartInspection && <StatusPill status={lead.status} />}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] items-start">
        {/* LEFT COLUMN: Vehicle Details, Customer Contact, Activity */}
        <div className="flex flex-col gap-6 min-w-0">
          <LeadVehicleCard lead={lead} />

          <LeadReferralCard leadId={lead.id} />

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
              canStartInspection ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-faint">Status *</span>
                  <LeadStartInspectionButton leadId={lead.id} visible />
                  <span className="text-xs text-text-muted">Save the inspection first. The status will then become Inspected and the next workflow statuses will be available.</span>
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
              )
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

            <LeadScheduledInspectionCard
              scheduledInspectionAt={scheduledInspectionAt}
              arrivalStatus={lead.arrivalStatus}
            />

            <LeadArrivalCard
              arrivalStatus={lead.arrivalStatus}
              canConfirmArrival={canConfirmArrival}
              arrivalEligible={arrivalEligible}
              markingArrival={markingArrival}
              onConfirmArrival={() => void confirmArrival()}
              showCard={canConfirmArrival || isPurchaser || lead.arrivalStatus === "arrived" || Boolean(scheduledInspectionAt)}
            />

            {priceRequired && (
              <LeadPurchaseFields
                purchasePrice={draft.purchasePrice}
                purchasedAt={draft.purchasedAt}
                error={errors.purchasePrice}
                disabled={priceLocked}
                onPriceChange={(val) => setDraft((d) => ({ ...d, purchasePrice: val }))}
                onDateChange={(val) => setDraft((d) => ({ ...d, purchasedAt: val }))}
              />
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
