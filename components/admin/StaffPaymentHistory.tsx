"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Search } from "lucide-react";
import { formatAed } from "@/lib/format";
import { formatUaeDateTime } from "@/lib/uae-time";
import { downloadStaffPaymentReceiptPdf } from "@/lib/admin/pdf-invoice";
import { paymentMatchesSearch, paymentReceiptId } from "@/lib/admin/payment-history-search";
import type { StaffCommissionPayment, StaffCommission } from "@/lib/admin/commission";
import { Dialog } from "@/components/ui/Dialog";

type PaymentWithStaff = StaffCommissionPayment & { staffName: string; roleLabel: string };

export function StaffPaymentHistory({
  payments,
  staff,
  canDownload = false,
}: {
  payments: StaffCommissionPayment[];
  staff: Pick<StaffCommission, "displayName" | "role">;
  canDownload?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [copiedReceiptId, setCopiedReceiptId] = useState<string | null>(null);
  const visiblePayments = useMemo(
    () => payments.filter((payment) => paymentMatchesSearch(payment, search)),
    [payments, search],
  );

  async function copyReceiptId(receiptId: string) {
    try {
      await navigator.clipboard.writeText(receiptId);
      setCopiedReceiptId(receiptId);
      window.setTimeout(() => setCopiedReceiptId((current) => current === receiptId ? null : current), 1600);
    } catch {
      setCopiedReceiptId(null);
    }
  }

  return (
    <section className="border-t border-border px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-medium text-text">Payment history</h3>
          <p className="mt-1 text-xs text-text-muted">Permanent record of confirmed staff payouts.</p>
        </div>
        <span className="shrink-0 text-xs text-text-faint">{payments.length} recorded</span>
      </div>
      {payments.length === 0 ? (
        <p className="py-5 text-sm text-text-faint">No payments recorded yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {payments.length > 1 && (
            <label className="relative block">
              <span className="sr-only">Search payment history</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search receipt ID, date, car, customer, or amount"
                className="min-h-11 w-full rounded-btn border border-border bg-bg px-10 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
              />
            </label>
          )}
          {visiblePayments.map((payment) => {
            const receiptId = paymentReceiptId(payment.id);
            const copied = copiedReceiptId === receiptId;

            return (
              <details key={payment.id} className="rounded-card border border-border bg-surface-2 px-3 py-3">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-text">Paid {formatUaeDateTime(payment.paidAt)}</p>
                    <p className="mt-1 text-xs text-text-muted">Confirmed by {payment.paidByName} - {payment.entryCount} {payment.entryCount === 1 ? "sale" : "sales"}</p>
                    <p className="mt-1 text-xs text-text-muted">Receipt ID: <code className="font-mono font-semibold tracking-wide text-text">{receiptId}</code></p>
                  </div>
                  <span className="shrink-0 tabular-nums font-medium text-gold">{formatAed(payment.totalAmount)}</span>
                </summary>
                <ul className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                  {payment.entries.map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 text-text-muted">{entry.leadName} - {entry.carDetails}</span>
                      <span className="shrink-0 tabular-nums text-text">{formatAed(entry.commission)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-text-muted">Receipt ID</span>
                  <code className="rounded border border-border bg-bg px-2 py-1 font-mono font-semibold tracking-wide text-text">{receiptId}</code>
                  <button
                    type="button"
                    onClick={() => void copyReceiptId(receiptId)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-2.5 font-medium text-text-muted transition-colors hover:border-gold hover:text-text focus:outline-none focus:ring-2 focus:ring-gold/40"
                    aria-label={`Copy receipt ID ${receiptId}`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                {canDownload && (
                  <button
                    type="button"
                    onClick={() => downloadStaffPaymentReceiptPdf(staff, payment)}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-gold/50 px-3 text-xs font-medium text-text transition-colors hover:border-gold hover:bg-gold/10"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download payment invoice (PDF)
                  </button>
                )}
              </details>
            );
          })}
          {visiblePayments.length === 0 && (
            <p className="rounded-card border border-dashed border-border px-3 py-4 text-sm text-text-muted">No payment matches that search.</p>
          )}
        </div>
      )}
    </section>
  );
}

export function RecentStaffPayments({ payments }: { payments: PaymentWithStaff[] }) {
  const [showAll, setShowAll] = useState(false);
  const recentPayments = payments.slice(0, 3);

  if (payments.length === 0) return null;
  return (
    <>
      <section className="border-t border-border pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Recent payments</h2>
            <p className="mt-1 text-sm text-text-muted">Latest confirmed staff payouts. Times are UAE.</p>
          </div>
          {payments.length > recentPayments.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex min-h-11 items-center rounded-full border border-gold/50 px-4 text-sm font-medium text-text transition-colors hover:border-gold hover:bg-gold/10"
            >
              See all payments ({payments.length})
            </button>
          )}
        </div>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {recentPayments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-text">{payment.staffName}</span>
                <span className="ml-2 text-xs text-text-muted">{payment.roleLabel}</span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="whitespace-nowrap tabular-nums font-semibold text-gold">{formatAed(payment.totalAmount)}</span>
                <span className="whitespace-nowrap">{formatUaeDateTime(payment.paidAt)}</span>
                <span className="whitespace-nowrap">Confirmed by {payment.paidByName}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={showAll} onClose={() => setShowAll(false)} title={`Payment history (${payments.length})`} className="max-w-3xl p-0">
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="mb-4 text-sm text-text-muted">All confirmed staff payouts. Times are UAE.</p>
          <ul className="divide-y divide-border border-y border-border">
            {payments.map((payment) => (
              <li key={payment.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-medium text-text">{payment.staffName} <span className="text-xs font-normal text-text-muted">{payment.roleLabel}</span></p>
                    <p className="mt-1 text-xs text-text-muted">{formatUaeDateTime(payment.paidAt)} - Confirmed by {payment.paidByName}</p>
                    <p className="mt-1 text-xs text-text-muted">Receipt ID: <code className="font-mono font-semibold tracking-wide text-text">{paymentReceiptId(payment.id)}</code></p>
                  </div>
                  <span className="shrink-0 tabular-nums font-semibold text-gold">{formatAed(payment.totalAmount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
