"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Phone, Save } from "lucide-react";
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
import {
  DETAIL_STATUS_OPTIONS,
  formatAed,
  formatDate,
  formatPhoneDisplay,
  requiresPurchasePrice,
  STATUS_HINT,
  STATUS_LABEL,
} from "@/lib/format";
import { INVENTORY_STATUS_LABEL, type InventoryItem } from "@/lib/admin/inventory";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoInventory } from "@/config/demo-admin-data";
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

type Draft = { status: LeadStatus; notes: string; purchasePrice: string; purchasedAt: string };

/** `yyyy-mm-dd` in local time, for a native date input. */
function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function draftFromLead(lead: Lead): Draft {
  return {
    // A lead being viewed is by definition no longer New.
    status: lead.status === "new" ? "pending" : lead.status,
    notes: lead.notes ?? "",
    // Both are filled in from the inventory record once it loads — the purchase
    // figures live on the car, not the lead. See migration 0014.
    purchasePrice: "",
    purchasedAt: todayInputValue(),
  };
}

export function LeadDetail({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();

  // Edits live here until Save. Nothing on this page writes through on blur —
  // a half-typed value or a mis-clicked status must not reach the database.
  const [draft, setDraft] = useState<Draft>(() => draftFromLead(lead));
  const [saved, setSaved] = useState<Draft>(() => draftFromLead(lead));
  const [errors, setErrors] = useState<{ status?: string; notes?: string; purchasePrice?: string }>({});
  // The car bought from this lead, if the deal has already been recorded.
  const [car, setCar] = useState<InventoryItem | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      draft.status !== saved.status ||
      draft.notes !== saved.notes ||
      draft.purchasePrice !== saved.purchasePrice ||
      draft.purchasedAt !== saved.purchasedAt,
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

  // What was paid lives on the inventory record, so it is fetched rather than
  // read off the lead. Loading it also fills the form, letting the owner
  // correct a mistyped price by editing the figure already shown.
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
      // Non-fatal: the rest of the lead still works without it.
    }
  }, [lead.id]);

  useEffect(() => {
    void loadCar();
  }, [loadCar]);

  // Seeds the form from the saved purchase once, without marking it dirty.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!car || seededRef.current) return;
    seededRef.current = true;
    const next: Draft = {
      ...draftFromLead(lead),
      notes: lead.notes ?? "",
      purchasePrice: String(car.purchasePriceAed),
      purchasedAt: car.purchasedAt.slice(0, 10),
    };
    setDraft(next);
    setSaved(next);
  }, [car, lead]);

  const priceRequired = requiresPurchasePrice(draft.status);
  // A sold car's purchase price is frozen into its commission entry; changing
  // it afterwards would leave the ledger disagreeing with what was invoiced.
  const priceLocked = car?.status === "sold";

  function validate(): boolean {
    const next: typeof errors = {};

    if (!draft.status) next.status = "Choose a status.";
    if (!draft.notes.trim()) next.notes = "Notes are required before saving.";

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
      // Only sent at Deal. The server writes these to the car's inventory
      // record, not to the lead, and creates that record if it is the first time.
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

    // Pick up the car that recording the deal just created, so the link to
    // Inventory appears without a reload.
    if (recordingPurchase) void loadCar();

    setSaved(draft);
    setErrors({});
    setJustSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 2200);
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
            <h3 className="text-fluid-0 text-text">Status &amp; purchase</h3>

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

            {/* Money is asked for at Deal and nowhere else — that is the moment
                the car was actually bought. Saving here also puts the car into
                Inventory, so the owner never re-types the vehicle. */}
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
                <p className="-mt-1 text-fluid--1 text-text-faint">
                  {priceLocked
                    ? "This car has been sold, so the price it was bought for can no longer be changed."
                    : "Exactly what you paid the customer. Saving adds this car to your Inventory."}
                </p>
              </>
            )}

            {car && (
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between gap-3 rounded-card border border-border px-3 py-2.5 text-fluid--1 hover:border-gold/50"
              >
                <span className="text-text-muted">
                  In Inventory · <span className="text-text">{INVENTORY_STATUS_LABEL[car.status]}</span>
                </span>
                <span className="text-gold">{formatAed(car.purchasePriceAed)}</span>
              </Link>
            )}

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-text-faint">{label}</p>
      <p className="mt-0.5 break-words text-text">{value}</p>
    </div>
  );
}
