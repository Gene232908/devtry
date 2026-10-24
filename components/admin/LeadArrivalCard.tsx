"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, Phone, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { formatUaeDateTime } from "@/lib/uae-time";

type ReversalRecord = {
  leadId: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
};

function normalizePhoneDigits(val: string): string {
  return val.replace(/\D/g, "");
}

function verifyPhoneMatch(entered: string, actual?: string): boolean {
  if (!entered.trim() || !actual) return false;
  const cleanEntered = normalizePhoneDigits(entered);
  const cleanActual = normalizePhoneDigits(actual);
  if (!cleanEntered || !cleanActual) return false;
  if (cleanEntered === cleanActual) return true;

  // In UAE: compare after stripping leading country code (971) or trunk 0
  const stripUaePrefix = (d: string) => {
    if (d.startsWith("971")) return d.slice(3);
    if (d.startsWith("0")) return d.slice(1);
    return d;
  };

  const a = stripUaePrefix(cleanEntered);
  const b = stripUaePrefix(cleanActual);
  if (a === b) return true;

  // Fallback: match last 9 digits (standard UAE mobile number length)
  if (cleanEntered.length >= 7 && cleanActual.length >= 7) {
    const endA = cleanEntered.slice(-9);
    const endB = cleanActual.slice(-9);
    if (endA === endB) return true;
  }

  return false;
}

type Props = {
  leadId: string;
  customerPhone?: string;
  arrivalStatus?: "not_arrived" | "arrived";
  canConfirmArrival: boolean;
  arrivalEligible: boolean;
  markingArrival: boolean;
  onConfirmArrival: () => Promise<void> | void;
  onRevertArrival?: (reason?: string) => Promise<void> | void;
  onRequestReversal?: (reason: string) => Promise<void> | void;
  onDeclineReversal?: () => Promise<void> | void;
  showCard: boolean;
  isSuperAdmin?: boolean;
  staffRole?: string;
  staffName?: string;
};

export function LeadArrivalCard({
  leadId,
  customerPhone,
  arrivalStatus,
  canConfirmArrival,
  arrivalEligible,
  markingArrival,
  onConfirmArrival,
  onRevertArrival,
  onRequestReversal,
  onDeclineReversal,
  showCard,
  isSuperAdmin = false,
  staffName = "Customer Service",
}: Props) {
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalError, setReversalError] = useState<string | null>(null);

  const [superAdminRevertModalOpen, setSuperAdminRevertModalOpen] = useState(false);
  const [adminReason, setAdminReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState<ReversalRecord | null>(null);

  useEffect(() => {
    // Clear legacy localStorage to prevent stale reversals
    try {
      localStorage.removeItem("cvd_arrival_reversals_v1");
    } catch {}

    if (arrivalStatus !== "arrived") {
      setPendingRequest(null);
      return;
    }

    let active = true;
    async function loadPending() {
      try {
        const res = await fetch(`/api/leads/${leadId}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (active && json.ok) {
            setPendingRequest(json.data?.pendingReversal ?? null);
          }
        }
      } catch {
        // network fallback
      }
    }

    void loadPending();
    return () => {
      active = false;
    };
  }, [leadId, arrivalStatus]);

  if (!showCard) return null;

  const isArrived = arrivalStatus === "arrived";

  function handleToggleClick() {
    if (!isArrived) {
      if (isSuperAdmin) {
        // Super Admin (Sir Nash) can confirm arrival directly without entering the customer's phone number
        void onConfirmArrival();
      } else {
        // Customer Service / staff requires phone number verification to confirm arrival
        setPhoneInput("");
        setPhoneError(null);
        setPhoneModalOpen(true);
      }
    } else {
      // Attempting to turn OFF arrival status:
      if (isSuperAdmin) {
        // Super Admin (Sir Nash) can turn off with confirmation
        setAdminReason("");
        setSuperAdminRevertModalOpen(true);
      } else {
        // Customer Service cannot toggle off directly; must request with reason for Sir Nash
        setReversalReason("");
        setReversalError(null);
        setReversalModalOpen(true);
      }
    }
  }

  async function handleConfirmPhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneInput.trim()) {
      setPhoneError("Please input the customer's phone number.");
      return;
    }

    const matches = verifyPhoneMatch(phoneInput, customerPhone);
    if (!matches) {
      setPhoneError("Phone number does not match this customer's record. Please verify and try again.");
      return;
    }

    setPhoneError(null);
    setPhoneModalOpen(false);
    setPendingRequest(null);
    await onConfirmArrival();
  }

  async function handleReversalRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reversalReason.trim()) {
      setReversalError("Please provide a reason to request arrival reversal from Sir Nash.");
      return;
    }

    const rec: ReversalRecord = {
      leadId,
      reason: reversalReason.trim(),
      requestedBy: staffName,
      requestedAt: new Date().toISOString(),
    };

    setPendingRequest(rec);
    setReversalModalOpen(false);

    if (onRequestReversal) {
      await onRequestReversal(reversalReason.trim());
    }
  }

  async function handleApproveReversal() {
    const reason = pendingRequest?.reason;
    setPendingRequest(null);
    if (onRevertArrival) {
      await onRevertArrival(reason);
    }
  }

  async function handleDeclineReversal() {
    setPendingRequest(null);
    if (onDeclineReversal) {
      await onDeclineReversal();
    }
  }

  async function handleSuperAdminDirectRevert() {
    const reason = adminReason.trim() || undefined;
    setPendingRequest(null);
    setSuperAdminRevertModalOpen(false);
    if (onRevertArrival) {
      await onRevertArrival(reason);
    }
  }

  if (canConfirmArrival) {
    return (
      <>
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text">Arrival Status</p>
                {isArrived && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <Check className="h-3 w-3" /> Confirmed
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {arrivalEligible
                  ? "Confirm only when the customer has arrived at the facility for the scheduled inspection."
                  : "Available after Inspection Scheduled is saved and a Purchaser has been assigned."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isArrived}
              disabled={!arrivalEligible || markingArrival}
              onClick={handleToggleClick}
              title={
                isArrived
                  ? isSuperAdmin
                    ? "Click to turn off customer arrival"
                    : "Click to request arrival reversal from Sir Nash"
                  : isSuperAdmin
                    ? "Click to confirm customer arrival directly (Super Admin)"
                    : "Click to verify and confirm customer arrival"
              }
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
                isArrived ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                  isArrived ? "translate-x-6" : "translate-x-1"
                }`}
              >
                {isArrived && <Check className="h-3.5 w-3.5 text-emerald-700" />}
              </span>
            </button>
          </div>

          <p
            className={`mt-3 text-xs font-medium ${
              isArrived ? "text-emerald-400" : "text-text-faint"
            }`}
          >
            {isArrived
              ? "Arrived — Purchaser can now see this confirmation."
              : "Not yet arrived"}
          </p>

          {/* Pending Reversal Alert for Super Admin (Sir Nash) */}
          {isArrived && pendingRequest && isSuperAdmin && (
            <div className="mt-3.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Customer Service Requested Arrival Reversal</span>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-text">
                <p className="text-[11px] font-medium text-amber-300/90 mb-1">Reason for request:</p>
                <p className="italic">&ldquo;{pendingRequest.reason}&rdquo;</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-faint pt-0.5">
                <span>Requested by: <strong className="text-text">{pendingRequest.requestedBy}</strong></span>
                <span>{formatUaeDateTime(pendingRequest.requestedAt)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1.5 border-t border-white/10">
                <button
                  type="button"
                  disabled={markingArrival}
                  onClick={() => void handleApproveReversal()}
                  className="rounded-lg bg-amber-400 hover:bg-amber-300 text-black px-3 py-1.5 text-xs font-semibold transition-colors shadow"
                >
                  Approve &amp; Turn Off Arrival
                </button>
                <button
                  type="button"
                  onClick={handleDeclineReversal}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                >
                  Decline Request
                </button>
              </div>
            </div>
          )}

          {/* Pending Reversal Banner for Customer Service */}
          {isArrived && pendingRequest && !isSuperAdmin && (
            <div className="mt-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>Arrival Reversal Request Pending — Waiting for Sir Nash Action</span>
              </div>
              <p className="text-xs text-text-muted">
                Your request to turn off arrival has been submitted.
              </p>
              <p className="text-xs text-text-faint italic">
                Reason: &ldquo;{pendingRequest.reason}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Modal 1: Verify Customer Phone Number before Arrival confirmation */}
        <Dialog
          open={phoneModalOpen}
          onClose={() => setPhoneModalOpen(false)}
          title="Verify Customer Arrival"
          className="max-w-md p-6"
        >
          <form onSubmit={handleConfirmPhoneSubmit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-text-muted">
              <ShieldCheck className="h-5 w-5 text-gold shrink-0" />
              <span>
                To ensure that the customer has legitimately arrived at the facility, please input the customer&apos;s phone number.
              </span>
            </div>

            <div>
              <label htmlFor="customer-arrival-phone-input" className="block text-xs font-semibold text-text mb-1.5">
                Customer Phone Number *
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
                <input
                  id="customer-arrival-phone-input"
                  type="tel"
                  autoFocus
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setPhoneError(null);
                  }}
                  placeholder="e.g. +971 50 123 4567 or 0501234567"
                  className="min-h-11 w-full rounded-btn border border-border bg-bg pl-10 pr-3 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
                />
              </div>
              {phoneError && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{phoneError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                className="rounded-btn border border-border px-4 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={markingArrival}
                className="rounded-btn bg-gold hover:bg-gold-light text-black px-4 py-2 text-xs font-semibold transition-colors shadow disabled:opacity-50"
              >
                Confirm Customer Arrived
              </button>
            </div>
          </form>
        </Dialog>

        {/* Modal 2: Customer Service Request Arrival Reversal to Sir Nash */}
        <Dialog
          open={reversalModalOpen}
          onClose={() => setReversalModalOpen(false)}
          title="Request Arrival Reversal"
          className="max-w-md p-6"
        >
          <form onSubmit={handleReversalRequestSubmit} className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-text-muted">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Customer arrival is currently confirmed. To turn off this status, please state the reason for Sir Nash (Super Admin) to review and approve.
              </span>
            </div>

            <div>
              <label htmlFor="arrival-reversal-reason-input" className="block text-xs font-semibold text-text mb-1.5">
                Reason for Reversal *
              </label>
              <textarea
                id="arrival-reversal-reason-input"
                rows={3}
                autoFocus
                value={reversalReason}
                onChange={(e) => {
                  setReversalReason(e.target.value);
                  setReversalError(null);
                }}
                placeholder="e.g. Accidentally toggled, customer called saying they have to reschedule, etc."
                className="w-full rounded-btn border border-border bg-bg p-3 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
              />
              {reversalError && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{reversalError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setReversalModalOpen(false)}
                className="rounded-btn border border-border px-4 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-btn bg-gold hover:bg-gold-light text-black px-4 py-2 text-xs font-semibold transition-colors shadow"
              >
                Submit Request to Sir Nash
              </button>
            </div>
          </form>
        </Dialog>

        {/* Modal 3: Super Admin (Sir Nash) Direct Turn Off Confirmation */}
        <Dialog
          open={superAdminRevertModalOpen}
          onClose={() => setSuperAdminRevertModalOpen(false)}
          title="Turn Off Customer Arrival"
          className="max-w-md p-6"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Are you sure you want to revert this customer&apos;s arrival status back to <strong className="text-text">Not yet arrived</strong>?
            </p>

            <div>
              <label htmlFor="admin-revert-reason" className="block text-xs font-semibold text-text mb-1.5">
                Reason / Note for Reversal (Recorded in Staff Audit)
              </label>
              <input
                id="admin-revert-reason"
                type="text"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="e.g. Premature check-in, customer not on site, etc."
                className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSuperAdminRevertModalOpen(false)}
                className="rounded-btn border border-border px-4 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={markingArrival}
                onClick={() => void handleSuperAdminDirectRevert()}
                className="rounded-btn bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-xs font-semibold transition-colors shadow disabled:opacity-50"
              >
                Confirm Turn Off
              </button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  // Purchaser or view-only staff
  return (
    <div
      className={`rounded-card border p-4 ${
        isArrived
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border bg-surface-2"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isArrived
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {isArrived ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${
                isArrived ? "text-emerald-300" : "text-text"
              }`}
            >
              {isArrived ? "Customer Has Arrived" : "Customer Arrival Status"}
            </p>
            <p className="text-xs text-text-muted">
              {isArrived
                ? "Checked in by Customer Service. Customer is at the facility."
                : "Awaiting Customer Service check-in upon arrival at the facility."}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isArrived
              ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
              : "border border-zinc-700 bg-zinc-800 text-zinc-400"
          }`}
        >
          {isArrived ? "Ready for Inspection" : "Not Yet Arrived"}
        </span>
      </div>
    </div>
  );
}
