"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatAed } from "@/lib/format";
import { formatEventTimestamp } from "@/lib/admin/lead-events";
import type { InventoryItem } from "@/lib/admin/inventory";
import { useStaffIdentity } from "@/lib/admin/staff-identity-context";

type Expense = { id: string; description: string; amountAed: number; createdByName?: string; createdByRole?: string | null; createdAt: string };

export function InventoryExpensesCard({ car, onChanged }: { car: InventoryItem; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
  const identity = useStaffIdentity();
  const isSuperAdmin = identity?.role === "admin";
  const isCustomerService = identity?.role === "call_center";
  const canSeeApprovalMessage = isCustomerService || identity?.role === "purchaser";
  const isOwner = identity?.role === "admin" || identity?.role === "manager";
  const locked = car.financialStatus === "confirmed" || car.financialStatus === "paid_locked";
  const awaitingConfirmation = car.financialStatus === "awaiting_confirmation";
  const visibleTotal = locked ? car.expenseTotalAed : expenses.reduce((total, expense) => total + expense.amountAed, 0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/inventory/${car.id}/expenses`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body?.error?.message ?? "Couldn't load expenses.");
      setExpenses(body.data.expenses ?? []);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load expenses.");
    }
  }, [car.id]);

  useEffect(() => {
    if (open && !loaded) void load();
  }, [open, loaded, load]);

  async function saveExpense() {
    const parsed = Number(amount);
    if (!description.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a description and an amount greater than zero.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/inventory/${car.id}/expenses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amountAed: parsed }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body?.error?.message ?? "Couldn't save the expense.");
      setDescription(""); setAmount(""); setLoaded(false);
      await load(); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save the expense."); }
    finally { setBusy(false); }
  }

  async function removeExpense(expenseId: string) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/inventory/${car.id}/expenses?expenseId=${encodeURIComponent(expenseId)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body?.error?.message ?? "Couldn't remove the expense.");
      setLoaded(false); await load(); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't remove the expense."); }
    finally { setBusy(false); }
  }

  async function confirmExpenses() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/inventory/${car.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_expenses", financial_review_version: car.financialReviewVersion }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body?.error?.message ?? "Couldn't confirm expenses.");
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't confirm expenses."); }
    finally { setBusy(false); }
  }

  async function reopenFinances() {
    if (correctionReason.trim().length < 3) {
      setError("Add a short reason for this correction.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/inventory/${car.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen_finances", correction_reason: correctionReason }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body?.error?.message ?? "Couldn't reopen financial review.");
      setCorrectionReason(""); setShowCorrection(false); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't reopen financial review."); }
    finally { setBusy(false); }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">Expenses</p>
          <p className="text-xs text-text-muted">Manual costs for this vehicle.</p>
        </div>
        <span className="tabular-nums text-lg font-semibold text-gold">{formatAed(visibleTotal)}</span>
      </div>

      {car.status === "sold" && (
        <div className={`rounded-card border px-3 py-2 text-xs ${awaitingConfirmation ? "border-warning/40 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success"}`}>
          {awaitingConfirmation
            ? canSeeApprovalMessage
              ? "Commission is not payable yet and waiting for admin approval."
              : "Expenses awaiting review."
            : "Expenses confirmed — net-profit commission is frozen."}
        </div>
      )}

      {car.status === "sold" && car.salePriceAed !== null && (
        <div className={`grid gap-x-4 gap-y-2 rounded-card bg-surface-2 p-3 text-xs ${isCustomerService ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4"}`}>
          {!isCustomerService && <Metric label="Bought" value={formatAed(car.purchasePriceAed)} />}
          <Metric label="Expenses" value={formatAed(car.expenseTotalAed)} />
          {!isCustomerService && <Metric label="Sold" value={formatAed(car.salePriceAed)} />}
          {!isCustomerService && <Metric label="Net profit" value={car.netProfitAed === null ? "Pending review" : formatAed(car.netProfitAed)} />}
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={() => setOpen((value) => !value)}>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "Hide expense details" : "View / add expense"}
      </Button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {loaded && expenses.length === 0 && <p className="text-xs text-text-muted">No expenses recorded.</p>}
          {expenses.map((expense) => (
            <div key={expense.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-text">{expense.description}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Added by {expense.createdByName ?? "Staff member"}
                  {expense.createdByRole ? ` (${expense.createdByRole.replace("_", " ")})` : ""} · {formatEventTimestamp(expense.createdAt)}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 tabular-nums text-text-muted">
                {formatAed(expense.amountAed)}
                {!locked && <button type="button" disabled={busy} onClick={() => void removeExpense(expense.id)} className="rounded p-1 text-text-faint hover:text-danger disabled:opacity-50" aria-label={`Remove ${expense.description}`}><Trash2 className="h-3.5 w-3.5" /></button>}
              </span>
            </div>
          ))}
          {!locked && <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
            <Input label="" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Transport" maxLength={240} />
            <Input label="" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="AED" />
            <Button type="button" disabled={busy} onClick={() => void saveExpense()}><Plus className="h-4 w-4" />Add</Button>
          </div>}
          {locked && <p className="text-xs text-text-muted">Confirmed expenses are locked. Ask Super Admin to review a correction.</p>}
        </div>
      )}

      {awaitingConfirmation && isSuperAdmin && <Button disabled={busy} onClick={() => void confirmExpenses()}><CheckCircle2 className="h-4 w-4" />Confirm expenses complete</Button>}
      {locked && isOwner && car.financialStatus === "confirmed" && (
        <>
          <Button variant="outline" onClick={() => setShowCorrection((value) => !value)}>Correct expenses</Button>
          {showCorrection && <div className="flex flex-col gap-2 rounded-card border border-warning/30 bg-warning/5 p-3">
            <Input label="Correction reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="e.g. Transport invoice was entered late" maxLength={500} />
            <Button variant="outline" disabled={busy} onClick={() => void reopenFinances()}>Reopen financial review</Button>
          </div>}
        </>
      )}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-text-faint">{label}</p><p className="mt-0.5 tabular-nums text-text">{value}</p></div>;
}
