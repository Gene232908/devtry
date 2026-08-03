"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatAed, formatDate } from "@/lib/format";
import { COMMISSION_RATE } from "@/lib/admin/inventory";
import {
  formatMonth,
  groupIntoQuarters,
  STATEMENT_STATUS_LABEL,
  type CommissionStatement,
  type Quarter,
} from "@/lib/admin/commission";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoCommissionStatements } from "@/config/demo-admin-data";

// The developer's 2% share. The RECORD is monthly and the PAYMENT is quarterly,
// exactly as the milestone brief words it — so months are the rows and the
// quarter is the heading that sums and settles them.

const QUARTER_TONE: Record<Quarter["status"], string> = {
  draft: "text-text-muted",
  partial: "text-warning",
  issued: "text-info",
  paid: "text-success",
};

const QUARTER_LABEL: Record<Quarter["status"], string> = {
  draft: "Not yet issued",
  partial: "Partly issued",
  issued: "Awaiting payment",
  paid: "Paid",
};

type PendingAction = { quarter: Quarter; status: "issued" | "paid" } | null;

export default function CommissionPage() {
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    if (ADMIN_PREVIEW) {
      setStatements(demoCommissionStatements);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/commission", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? "Couldn't load your commission statements.");
        return;
      }
      setStatements(body.data.statements ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const quarters = useMemo(() => groupIntoQuarters(statements), [statements]);

  const outstanding = useMemo(
    () => statements.filter((s) => s.status !== "paid").reduce((n, s) => n + s.totalCommissionAed, 0),
    [statements],
  );
  const paidToDate = useMemo(
    () => statements.filter((s) => s.status === "paid").reduce((n, s) => n + s.totalCommissionAed, 0),
    [statements],
  );

  async function runPending() {
    if (!pending) return;
    setBusy(true);
    setActionError(null);

    const ids = pending.quarter.months
      // Issuing only affects drafts; paying affects anything not already paid.
      .filter((m) => (pending.status === "issued" ? m.status === "draft" : m.status !== "paid"))
      .map((m) => m.id);

    if (ADMIN_PREVIEW) {
      const now = new Date().toISOString();
      setStatements((current) =>
        current.map((s) =>
          ids.includes(s.id)
            ? {
                ...s,
                status: pending.status,
                issuedAt: pending.status === "issued" ? now : s.issuedAt,
                paidAt: pending.status === "paid" ? now : s.paidAt,
              }
            : s,
        ),
      );
      setBusy(false);
      setPending(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: pending.status }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setActionError(body?.error?.message ?? "Couldn't update the statement.");
        return;
      }
      setPending(null);
      await load();
    } catch {
      setActionError("Couldn't reach the server. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Commission</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          The developer&apos;s {(COMMISSION_RATE * 100).toFixed(0)}% share of the profit on every car sold. Recorded
          monthly, paid every three months.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-gold/40 p-4">
          <p className="text-fluid--1 text-text-faint">Outstanding</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-gold">{formatAed(outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-fluid--1 text-text-faint">Paid to date</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-text">{formatAed(paidToDate)}</p>
        </Card>
      </div>

      {loading ? (
        <Card className="p-5">
          <p className="text-fluid--1 text-text-muted">Loading…</p>
        </Card>
      ) : quarters.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">Nothing to pay yet.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            A month appears here once a car has been sold in it.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {quarters.map((q) => (
            <Card key={q.key} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-fluid-1 text-text">{q.label}</h2>
                  <p className={`mt-0.5 text-fluid--1 ${QUARTER_TONE[q.status]}`}>
                    {QUARTER_LABEL[q.status]} · {q.entryCount} {q.entryCount === 1 ? "car" : "cars"} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-fluid--1 text-text-faint">Payable this quarter</p>
                  <p className="tabular-nums text-fluid-1 text-gold">{formatAed(q.totalCommissionAed)}</p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-fluid--1">
                  <thead>
                    <tr className="border-b border-border text-text-faint">
                      <th className="py-2 pr-4 font-normal">Month</th>
                      <th className="py-2 pr-4 text-right font-normal">Cars sold</th>
                      <th className="py-2 pr-4 text-right font-normal">Profit</th>
                      <th className="py-2 pr-4 text-right font-normal">Share ({(COMMISSION_RATE * 100).toFixed(0)}%)</th>
                      <th className="py-2 pr-1 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.months.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 text-text">{formatMonth(m.periodMonth)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{m.entryCount}</td>
                        <td
                          className={`py-3 pr-4 text-right tabular-nums ${
                            m.totalProfitAed < 0 ? "text-danger" : "text-text-muted"
                          }`}
                        >
                          {formatAed(m.totalProfitAed)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-gold">
                          {formatAed(m.totalCommissionAed)}
                        </td>
                        <td className="py-3 pr-1 text-text-muted">
                          {STATEMENT_STATUS_LABEL[m.status]}
                          {m.paidAt && <span className="block text-text-faint">{formatDate(m.paidAt)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {q.status !== "paid" && (
                <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4">
                  {q.status !== "issued" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionError(null);
                        setPending({ quarter: q, status: "issued" });
                      }}
                    >
                      <FileText className="h-4 w-4" /> Issue this quarter
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setActionError(null);
                      setPending({ quarter: q, status: "paid" });
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark quarter paid
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.status === "issued" ? "Issue this quarter?" : "Mark this quarter as paid?"}
        description={
          pending ? (
            <>
              {pending.status === "issued" ? (
                <>
                  This bills <span className="text-text">{formatAed(pending.quarter.totalCommissionAed)}</span> for{" "}
                  {pending.quarter.label}. Once issued, the sales in these months are locked — a car sold later and
                  backdated into them will go onto the next open month instead.
                </>
              ) : (
                <>
                  This records <span className="text-text">{formatAed(pending.quarter.totalCommissionAed)}</span> for{" "}
                  {pending.quarter.label} as settled. It cannot be undone from here.
                </>
              )}
            </>
          ) : null
        }
        confirmLabel={pending?.status === "issued" ? "Issue quarter" : "Mark as paid"}
        cancelLabel="Cancel"
        busy={busy}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      >
        {actionError && (
          <p className="text-fluid--1 text-danger" role="alert">
            {actionError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
