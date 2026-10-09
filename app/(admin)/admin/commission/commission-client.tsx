"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Download, Eye, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatAed, formatDate } from "@/lib/format";
import { useFreshServerData, useServerState } from "@/lib/admin/use-fresh-server-data";
import { COMMISSION_RATE } from "@/lib/admin/inventory";
import {
  formatMonth,
  type CommissionStatement,
  type StaffCommission,
  unpaidDeveloperStatements,
} from "@/lib/admin/commission";
import { downloadStaffInvoicePdf } from "@/lib/admin/pdf-invoice";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoCommissionStatements } from "@/config/demo-admin-data";

import { useStaffIdentity } from "@/lib/admin/staff-identity-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import {
  COMMISSION_SCOPES,
  CommissionScopeFilter,
  type CommissionScope,
} from "@/components/admin/CommissionScopeFilter";
import { RecentStaffPayments, StaffPaymentHistory } from "@/components/admin/StaffPaymentHistory";

// ─── Types ─────────────────────────────────────────────────────────────────

// ─── Demo data for preview mode ─────────────────────────────────────────────

const DEMO_AGENTS: StaffCommission[] = [
  {
    id: "agent-1",
    displayName: "Maricel",
    role: "call_center",
    totalCarsSold: 8,
    totalProfit: 124000,
    totalCommission: 2480,
    isPaidThisMonth: false,
    paidAt: null,
    entries: [
      { id: "e1", kind: "role_commission", leadName: "Ahmad Hassan", carDetails: "2022 BMW X5", soldAt: "2026-09-02", profit: 18000, commission: 360 },
      { id: "e2", kind: "role_commission", leadName: "Sara Ali", carDetails: "2023 Mercedes GLC", soldAt: "2026-09-05", profit: 22000, commission: 440 },
      { id: "e3", kind: "role_commission", leadName: "Omar Khalid", carDetails: "2021 Range Rover Sport", soldAt: "2026-08-28", profit: 15000, commission: 300 },
    ],
    paymentHistory: [],
  },
  {
    id: "agent-2",
    displayName: "Fatima",
    role: "call_center",
    totalCarsSold: 5,
    totalProfit: 78000,
    totalCommission: 1560,
    isPaidThisMonth: false,
    paidAt: null,
    entries: [
      { id: "e4", kind: "role_commission", leadName: "Khalid Noor", carDetails: "2022 Toyota Land Cruiser", soldAt: "2026-09-01", profit: 25000, commission: 500 },
      { id: "e5", kind: "role_commission", leadName: "Layla Mohammed", carDetails: "2023 Audi Q7", soldAt: "2026-09-04", profit: 20000, commission: 400 },
    ],
    paymentHistory: [],
  },
];

const DEMO_PURCHASERS: StaffCommission[] = [
  {
    id: "purchaser-1",
    displayName: "Ahmed",
    role: "purchaser",
    totalCarsSold: 6,
    totalProfit: 98000,
    totalCommission: 9800,
    isPaidThisMonth: false,
    paidAt: null,
    entries: [
      { id: "e6", kind: "role_commission", leadName: "Rashed Abdullah", carDetails: "2023 Porsche Cayenne", soldAt: "2026-09-03", profit: 32000, commission: 3200 },
      { id: "e7", kind: "role_commission", leadName: "Nadia Yusuf", carDetails: "2022 Lexus RX", soldAt: "2026-08-30", profit: 16000, commission: 1600 },
    ],
    paymentHistory: [],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommissionClient({
  initialStatements,
  initialError,
  initialAgents,
  initialPurchasers,
  initialReferralRecipients,
}: {
  initialStatements: CommissionStatement[];
  initialError: string | null;
  initialAgents?: StaffCommission[];
  initialPurchasers?: StaffCommission[];
  initialReferralRecipients?: StaffCommission[];
}) {
  useFreshServerData();
  const identity = useStaffIdentity();

  // Super Admin sees every commission category by default. This is a display
  // filter only; authorization and payment remain enforced by server routes.
  const [selectedScopes, setSelectedScopes] = useState<CommissionScope[]>([...COMMISSION_SCOPES]);

  // Agent/Purchaser commission data.
  //
  // `useServerState`, not `useState`, for the same reason `statements` below
  // needs it: `useFreshServerData()`'s focus/visibility/poll listeners call
  // `router.refresh()`, which re-renders THIS server component and produces a
  // new `initialAgents`/`initialPurchasers` prop — a plain `useState`
  // initialiser only runs once and would silently discard every one of those,
  // leaving a just-recorded sale invisible until a hard reload.
  const [agents, setAgents] = useServerState<StaffCommission[]>(
    initialAgents ?? (ADMIN_PREVIEW ? DEMO_AGENTS : []),
  );
  const [purchasers, setPurchasers] = useServerState<StaffCommission[]>(
    initialPurchasers ?? (ADMIN_PREVIEW ? DEMO_PURCHASERS : []),
  );
  const [referralRecipients, setReferralRecipients] = useServerState<StaffCommission[]>(initialReferralRecipients ?? []);

  // Developer commission (monthly records, payable anytime)
  const [statements, setStatements] = useServerState<CommissionStatement[]>(initialStatements);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const router = useRouter();
  const searchParams = useSearchParams();
  const attention = searchParams.get("attention");
  const isMissingCommission = attention === "missing-commission";

  // Detail view
  const [detailTarget, setDetailTarget] = useState<StaffCommission | null>(null);

  type StaffPayTarget = {
    staff: StaffCommission;
    entryIds?: string[];
    amount: number;
    count: number;
  };

  // Pay confirmation
  const [payTarget, setPayTarget] = useState<StaffPayTarget | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Developer pay confirmation
  const [devPayTarget, setDevPayTarget] = useState<{ ids: string[]; total: number; monthCount: number; carCount: number } | null>(null);
  const [devPayBusy, setDevPayBusy] = useState(false);
  const [devPayError, setDevPayError] = useState<string | null>(null);

  const isAgentViewer = identity?.role === "call_center";
  const isPurchaserViewer = identity?.role === "purchaser";
  const isStaffSelfViewer = isAgentViewer || isPurchaserViewer;

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadDeveloperStatements = useCallback(async () => {
    setError(null);
    setLoading(true);

    if (ADMIN_PREVIEW) {
      setStatements(demoCommissionStatements);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/commission", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? "Couldn't load commission statements.");
        return;
      }
      setStatements(body.data.statements ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, [setStatements]);

  const loadStaffCommission = useCallback(async () => {
    if (ADMIN_PREVIEW) return;

    try {
      const res = await fetch("/api/admin/commission/staff", { cache: "no-store" });
      const body = await res.json();
      if (res.ok && body.ok) {
        setAgents(body.data.agents ?? []);
        setPurchasers(body.data.purchasers ?? []);
        setReferralRecipients(body.data.referralRecipients ?? []);
      }
    } catch {
      // Non-fatal
    }
  }, [setAgents, setPurchasers, setReferralRecipients]);

  // ─── Pay handlers ─────────────────────────────────────────────────────────

  async function handlePayStaff() {
    if (!payTarget) return;
    setPayBusy(true);
    setPayError(null);

    if (ADMIN_PREVIEW) {
      const now = new Date().toISOString();
      const paidEntryIds = new Set(payTarget.entryIds ?? payTarget.staff.entries.map((e) => e.id));
      const paidEntries = payTarget.staff.entries.filter((e) => paidEntryIds.has(e.id));
      const remainingEntries = payTarget.staff.entries.filter((e) => !paidEntryIds.has(e.id));

      const newPaymentRecord = {
        id: "pay-" + Date.now().toString(36),
        totalAmount: payTarget.amount,
        entryCount: paidEntries.length,
        paidAt: now,
        paidByName: "Super Admin",
        entries: paidEntries,
      };

      const updateFn = (prev: StaffCommission[]) =>
        prev.map((s) => {
          if (s.id !== payTarget.staff.id) return s;
          const newTotalCommission = remainingEntries.reduce((sum, e) => sum + e.commission, 0);
          const newTotalCarsSold = remainingEntries.filter((e) => e.kind === "role_commission").length;
          const newTotalProfit = remainingEntries.reduce((sum, e) => sum + (e.profit ?? 0), 0);
          return {
            ...s,
            isPaidThisMonth: remainingEntries.length === 0,
            paidAt: remainingEntries.length === 0 ? now : s.paidAt,
            totalCarsSold: newTotalCarsSold,
            totalProfit: newTotalProfit,
            totalCommission: newTotalCommission,
            entries: remainingEntries,
            paymentHistory: [newPaymentRecord, ...(s.paymentHistory ?? [])],
          };
        });

      if (payTarget.staff.role === "call_center") setAgents(updateFn);
      else if (payTarget.staff.role === "purchaser") setPurchasers(updateFn);
      else setReferralRecipients(updateFn);

      setDetailTarget((current) => {
        if (!current || current.id !== payTarget.staff.id) return current;
        const newTotalCommission = remainingEntries.reduce((sum, e) => sum + e.commission, 0);
        const newTotalCarsSold = remainingEntries.filter((e) => e.kind === "role_commission").length;
        const newTotalProfit = remainingEntries.reduce((sum, e) => sum + (e.profit ?? 0), 0);
        return {
          ...current,
          isPaidThisMonth: remainingEntries.length === 0,
          paidAt: remainingEntries.length === 0 ? now : current.paidAt,
          totalCarsSold: newTotalCarsSold,
          totalProfit: newTotalProfit,
          totalCommission: newTotalCommission,
          entries: remainingEntries,
          paymentHistory: [newPaymentRecord, ...(current.paymentHistory ?? [])],
        };
      });

      setPayBusy(false);
      setPayTarget(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/commission/staff/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: payTarget.staff.id,
          entryIds: payTarget.entryIds,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setPayError(body?.error?.message ?? "Couldn't process payment.");
        return;
      }
      setPayTarget(null);
      await loadStaffCommission();
    } catch {
      setPayError("Couldn't reach the server.");
    } finally {
      setPayBusy(false);
    }
  }

  async function handlePayDeveloperNow() {
    if (!devPayTarget) return;
    setDevPayBusy(true);
    setDevPayError(null);

    const { ids } = devPayTarget;

    if (ADMIN_PREVIEW) {
      const now = new Date().toISOString();
      setStatements((current) =>
        current.map((s) =>
          ids.includes(s.id) ? { ...s, status: "paid" as const, paidAt: now } : s,
        ),
      );
      setDevPayBusy(false);
      setDevPayTarget(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "paid" }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setDevPayError(body?.error?.message ?? "Couldn't update the statement.");
        return;
      }
      setDevPayTarget(null);
      await loadDeveloperStatements();
    } catch {
      setDevPayError("Couldn't reach the server.");
    } finally {
      setDevPayBusy(false);
    }
  }

  // ─── Developer data ───────────────────────────────────────────────────────

  const unpaidDeveloper = useMemo(() => unpaidDeveloperStatements(statements), [statements]);
  const devOutstanding = useMemo(
    () => unpaidDeveloper.reduce((n, s) => n + s.totalCommissionAed, 0),
    [unpaidDeveloper],
  );
  const devPaid = useMemo(
    () => statements.filter((s) => s.status === "paid").reduce((n, s) => n + s.totalCommissionAed, 0),
    [statements],
  );

  // ─── Computed summaries ───────────────────────────────────────────────────

  const selectedStaff = useMemo(() => {
    const rows: StaffCommission[] = [];
    if (selectedScopes.includes("agents")) rows.push(...agents);
    if (selectedScopes.includes("purchasers")) rows.push(...purchasers);
    if (selectedScopes.includes("referrals")) rows.push(...referralRecipients);
    return Array.from(new Map(rows.map((staff) => [staff.id, staff])).values());
  }, [agents, purchasers, referralRecipients, selectedScopes]);
  const selectedStaffOutstanding = useMemo(
    () => selectedStaff.reduce((total, staff) => total + staff.totalCommission, 0),
    [selectedStaff],
  );
  const recentStaffPayments = useMemo(
    () => selectedStaff
      .flatMap((staff) => staff.paymentHistory.map((payment) => ({
        ...payment,
        staffName: staff.displayName,
        roleLabel: ROLE_LABELS[staff.role],
      })))
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
      .slice(0, 6),
    [selectedStaff],
  );
  const showsStaffCommission = selectedScopes.some((scope) => scope !== "developer");
  const showsDeveloperCommission = selectedScopes.includes("developer");

  // Staff self-view filtering
  const myAgentList = useMemo(() => {
    if (!identity) return agents;
    return agents.filter(
      (a) => a.id === identity.userId || (identity.userId === "preview" && a.id === "agent-1"),
    );
  }, [agents, identity]);

  const myPurchaserList = useMemo(() => {
    if (!identity) return purchasers;
    return purchasers.filter(
      (p) => p.id === identity.userId || (identity.userId === "preview" && p.id === "purchaser-1"),
    );
  }, [purchasers, identity]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const pageTitle = isStaffSelfViewer ? "My Commission" : "Commission";

  const pageDesc = isAgentViewer
    ? "Track your 2% commission and download statement invoices for your closed deals."
    : isPurchaserViewer
    ? "Track your earnings and download statement invoices for your closed deals (10% of profit per car)."
    : "Review agent, purchaser, and developer commission in one place.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-fluid-3 text-text">{pageTitle}</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">{pageDesc}</p>
        </div>

        {/* Multi-select role filter (Super Admin only). */}
        {!isStaffSelfViewer && (
          <CommissionScopeFilter selected={selectedScopes} onChange={setSelectedScopes} />
        )}
      </div>

      {isMissingCommission && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Record Check Active
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                Sold Cars Missing Commission Check
              </p>
              <p className="text-xs text-gray-300">
                Auditing completed vehicle sales to ensure all staff and developer commission payouts have been calculated and logged.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.replace("/admin/commission")}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
            Clear attention banner
          </button>
        </div>
      )}

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      {/* ─── Staff Self View ─────────────────────────────────────────────── */}
      {isAgentViewer && (
        <StaffCommissionView
          totalOutstanding={myAgentList.reduce((n, a) => n + a.totalCommission, 0)}
          staffList={myAgentList}
          emptyLabel="agents"
          isStaffSelf={true}
          hideProfit
          onViewDetails={setDetailTarget}
        />
      )}

      {isPurchaserViewer && (
        <StaffCommissionView
          totalOutstanding={myPurchaserList.reduce((n, a) => n + a.totalCommission, 0)}
          staffList={myPurchaserList}
          emptyLabel="purchasers"
          isStaffSelf={true}
          onViewDetails={setDetailTarget}
        />
      )}

      {/* ─── Super Admin Multi-Tab View ─────────────────────────────────── */}
      {!isStaffSelfViewer && showsStaffCommission && (
        <>
          <div className="rounded-card border border-gold/35 bg-gold/5 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Payout summary</p>
                <p className="mt-1 text-sm text-text-muted">Current unpaid amount across the commission categories shown below.</p>
              </div>
              <p className="tabular-nums text-2xl font-semibold text-gold">{formatAed(selectedStaffOutstanding + (showsDeveloperCommission ? devOutstanding : 0))}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
              <span>Staff commissions: <strong className="text-text">{formatAed(selectedStaffOutstanding)}</strong></span>
              {showsDeveloperCommission && <span>Developer share: <strong className="text-text">{formatAed(devOutstanding)}</strong></span>}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Staff Commissions</h2>
            <p className="mt-1 text-sm text-text-muted">Call Centre and Purchaser commissions paid individually.</p>
          </div>
          <StaffCommissionView
            totalOutstanding={selectedStaffOutstanding}
            staffList={selectedStaff}
            emptyLabel="selected staff"
            onViewDetails={setDetailTarget}
          />
          <RecentStaffPayments payments={recentStaffPayments} />
        </>
      )}

      {!isStaffSelfViewer && showsDeveloperCommission && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-text">Developer Share</h2>
            <p className="mt-1 text-sm text-text-muted">Pay anytime. Every sale adds the developer&apos;s 2% share here.</p>
          </div>
          <DeveloperCommissionView
            outstanding={devOutstanding}
            paidToDate={devPaid}
            statements={statements}
            loading={loading}
            onPayNow={() => {
              if (unpaidDeveloper.length === 0) return;
              setDevPayError(null);
              setDevPayTarget({
                ids: unpaidDeveloper.map((statement) => statement.id),
                total: devOutstanding,
                monthCount: unpaidDeveloper.length,
                carCount: unpaidDeveloper.reduce((total, statement) => total + statement.entryCount, 0),
              });
            }}
          />
        </>
      )}

      {!isStaffSelfViewer && selectedScopes.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">Choose at least one commission category.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Open the filter above and select Agents, Purchasers, Developer, or All.
          </p>
        </Card>
      )}

      <div>
        <Button
          variant="outline"
          onClick={() => {
            if (showsStaffCommission) void loadStaffCommission();
            if (showsDeveloperCommission) void loadDeveloperStatements();
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ─── Detail modal ─────────────────────────────────────────────── */}
      {detailTarget && (
        <StaffDetailModal
          staff={
            [...agents, ...purchasers, ...referralRecipients].find((s) => s.id === detailTarget.id) ?? detailTarget
          }
          canPay={!isStaffSelfViewer}
          hideProfit={isAgentViewer}
          onClose={() => setDetailTarget(null)}
          onMarkPaid={(selectedEntryIds, selectedAmount, selectedCount) => {
            const currentStaff =
              [...agents, ...purchasers, ...referralRecipients].find((s) => s.id === detailTarget.id) ?? detailTarget;
            setPayError(null);
            setPayTarget({
              staff: currentStaff,
              entryIds: selectedEntryIds && selectedEntryIds.length > 0 ? selectedEntryIds : undefined,
              amount: selectedAmount ?? currentStaff.totalCommission,
              count: selectedCount ?? currentStaff.entries.length,
            });
          }}
        />
      )}

      {/* ─── Staff pay confirmation ───────────────────────────────────── */}
      <ConfirmDialog
        open={payTarget !== null}
        title={payTarget?.entryIds && payTarget.entryIds.length > 0 ? "Record advance payment?" : "Mark all as paid?"}
        description={
          payTarget ? (
            <>
              This will record an advance payment of{" "}
              <span className="text-gold">{formatAed(payTarget.amount)}</span> for {payTarget.count}{" "}
              {payTarget.count === 1 ? "sale" : "sales"} to{" "}
              <span className="text-text">{payTarget.staff.displayName}</span>.{" "}
              {payTarget.entryIds && payTarget.entryIds.length > 0
                ? "The remaining unpaid sales will stay on their statement."
                : "A permanent payment history will keep the amount, included sales, UAE date/time, and confirmer."}
            </>
          ) : null
        }
        confirmLabel={payTarget?.entryIds && payTarget.entryIds.length > 0 ? "Record advance payment" : "Mark as Paid"}
        cancelLabel="Cancel"
        busy={payBusy}
        onConfirm={() => void handlePayStaff()}
        onCancel={() => setPayTarget(null)}
      >
        {payError && (
          <p className="text-fluid--1 text-danger" role="alert">
            {payError}
          </p>
        )}
      </ConfirmDialog>

      {/* ─── Developer pay confirmation ───────────────────────────────── */}
      <ConfirmDialog
        open={devPayTarget !== null}
        title="Record developer payment?"
        description={
          devPayTarget ? (
            <>
              This records <span className="text-gold">{formatAed(devPayTarget.total)}</span> for {devPayTarget.carCount} {devPayTarget.carCount === 1 ? "car" : "cars"} across {devPayTarget.monthCount} {devPayTarget.monthCount === 1 ? "month" : "months"}. It cannot be undone from here.
            </>
          ) : null
        }
        confirmLabel="Record payment"
        cancelLabel="Cancel"
        busy={devPayBusy}
        onConfirm={() => void handlePayDeveloperNow()}
        onCancel={() => setDevPayTarget(null)}
      >
        {devPayError && (
          <p className="text-fluid--1 text-danger" role="alert">
            {devPayError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

// ─── Staff Commission View (shared by Agents + Purchasers) ─────────────────

function StaffCommissionView({
  totalOutstanding,
  staffList,
  emptyLabel,
  isStaffSelf,
  hideProfit = false,
  onViewDetails,
}: {
  totalOutstanding: number;
  staffList: StaffCommission[];
  emptyLabel: string;
  isStaffSelf?: boolean;
  hideProfit?: boolean;
  onViewDetails: (staff: StaffCommission) => void;
}) {
  // A self-viewer's list is always exactly them — "Total Staff: 1" tells an
  // agent or purchaser nothing they didn't already know. What they actually
  // want next to their outstanding balance is how many cars that balance came
  // from, so the owner's cross-staff table keeps the staff count and the
  // individual view gets a total that means something to the person reading it.
  const totalCarsSold = staffList.reduce((n, s) => n + s.totalCarsSold, 0);
  // Financial columns are an owner-level grid feature, not a condition of
  // whether a staff member currently has an unpaid sale. Keeping them visible
  // makes the table stable and lets a zero-balance staff account read clearly.
  const showFinancialColumns = !hideProfit;


  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-gold/40 p-4">
          <p className="text-fluid--1 text-text-faint">Staff Commission Outstanding</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-gold">{formatAed(totalOutstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-fluid--1 text-text-faint">{isStaffSelf ? "Unpaid Sales" : "Staff Accounts"}</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-text">
            {isStaffSelf ? totalCarsSold : staffList.length}
          </p>
        </Card>
      </div>

      {staffList.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">No {emptyLabel} found.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Commission data will appear once staff are assigned and cars are sold.
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="overflow-x-auto">
            {/* table-fixed + explicit widths, not the default auto layout:
                auto-layout hands whatever width is left over to whichever
                column has the most "slack" in its content — here that meant
                Name (short names like "waaa") absorbed most of the row while
                Status sat with almost none, crowding it against Commission
                right next to it. Fixed widths give every column its own
                share regardless of how short or long its content happens to
                be, so the gaps between columns read as even. */}
            <table className={`w-full table-fixed text-left text-fluid--1 ${hideProfit ? "min-w-[680px]" : showFinancialColumns ? "min-w-[1120px]" : "min-w-[820px]"}`}>
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="w-[15%] py-2 pr-4 font-normal">Name</th>
                  <th className="w-[8%] py-2 pr-4 text-right font-normal">Unpaid Sales</th>
                  {showFinancialColumns && <>
                    <th className="w-[10%] py-2 pr-4 text-right font-normal">Sold for</th>
                    <th className="w-[9%] py-2 pr-4 text-right font-normal">Expenses</th>
                    <th className="w-[11%] py-2 pr-4 text-right font-normal">Net profit</th>
                    <th className="w-[7%] py-2 pr-4 text-right font-normal">Margin</th>
                  </>}
                  {!hideProfit && !showFinancialColumns && <th className="w-[15%] py-2 pr-4 text-right font-normal">Total Profit</th>}
                  {/* Extra right padding (pr-8, not pr-4) on purpose: this
                      column is right-aligned and the next one is left-aligned,
                      so their content would otherwise sit directly against
                      each other with nothing but the column boundary between
                      "AED 400" and "Unpaid". The padding pulls the number back
                      from that boundary to open up real breathing room. */}
                  <th className="w-[10%] py-2 pr-8 text-right font-normal">Commission</th>
                  <th className="w-[9%] py-2 pr-4 font-normal">Status</th>
                  <th className="w-[21%] py-2 pr-1 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-text">{staff.displayName}</p>
                      {!isStaffSelf && (
                        <p className="mt-0.5 text-[0.72rem] text-text-faint">
                          {ROLE_LABELS[staff.role]}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{staff.totalCarsSold}</td>
                    {showFinancialColumns && <>
                      <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{formatAed(getStaffFinancialSummary(staff).soldFor)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{formatAed(getStaffFinancialSummary(staff).expenses)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{formatAed(getStaffFinancialSummary(staff).netProfit)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{getStaffFinancialSummary(staff).margin == null ? "—" : `${getStaffFinancialSummary(staff).margin!.toFixed(1)}%`}</td>
                    </>}
                    {!hideProfit && !showFinancialColumns && <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{formatAed(staff.totalProfit)}</td>}
                    <td className="py-3 pr-8 text-right tabular-nums text-gold">{formatAed(staff.totalCommission)}</td>
                    <td className="py-3 pr-4">
                      {staff.totalCarsSold === 0 && staff.paidAt === null ? (
                        <span className="inline-flex whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-[0.72rem] text-text-faint">
                          No commission yet
                        </span>
                      ) : staff.isPaidThisMonth ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[0.72rem] text-success">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.72rem] text-warning">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-1">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => onViewDetails(staff)}>
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function getStaffFinancialSummary(staff: StaffCommission) {
  const financialEntries = staff.entries.filter((entry) => entry.kind === "role_commission" && entry.financialReview);
  const soldFor = financialEntries.reduce((total, entry) => total + (entry.financialReview?.salePrice ?? 0), 0);
  const expenses = financialEntries.reduce((total, entry) => total + (entry.financialReview?.expenses ?? 0), 0);
  const netProfit = financialEntries.reduce((total, entry) => total + (entry.financialReview?.netProfit ?? 0), 0);
  return { soldFor, expenses, netProfit, margin: soldFor > 0 ? (netProfit / soldFor) * 100 : null };
}

// ─── Staff Detail Modal ─────────────────────────────────────────────────────

function StaffDetailModal({
  staff,
  canPay,
  hideProfit = false,
  onClose,
  onMarkPaid,
}: {
  staff: StaffCommission;
  /** False for an agent or purchaser viewing their own detail — they can see
   *  and download this statement, but only the owner settles it. */
  canPay: boolean;
  hideProfit?: boolean;
  onClose: () => void;
  onMarkPaid: (selectedEntryIds?: string[], selectedAmount?: number, selectedCount?: number) => void;
}) {
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const roleEntries = staff.entries.filter((entry) => entry.kind === "role_commission");
  const hasFinancialReview = roleEntries.some((entry) => entry.financialReview);
  const referralEntries = staff.entries.filter((entry) => entry.kind === "referral_incentive");
  const referralTotal = referralEntries.reduce((total, entry) => total + entry.commission, 0);

  const selectedEntries = roleEntries.filter((entry) => selectedEntryIds.has(entry.id));
  const selectedAmount = selectedEntries.reduce((total, entry) => total + entry.commission, 0);
  const selectedCount = selectedEntries.length;
  const allSelected = roleEntries.length > 0 && roleEntries.every((entry) => selectedEntryIds.has(entry.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(roleEntries.map((entry) => entry.id)));
    }
  };

  const toggleEntry = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [showReferralBreakdown, setShowReferralBreakdown] = useState(false);
  const [referralSearch, setReferralSearch] = useState("");
  const [visibleReferrals, setVisibleReferrals] = useState(10);
  const filteredReferrals = useMemo(() => {
    const query = referralSearch.trim().toLowerCase();
    return query
      ? referralEntries.filter((entry) => `${entry.leadName} ${entry.carDetails} ${entry.soldAt}`.toLowerCase().includes(query))
      : referralEntries;
  }, [referralEntries, referralSearch]);

  function openReferralBreakdown() {
    setReferralSearch("");
    setVisibleReferrals(10);
    setShowReferralBreakdown(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${staff.displayName} commission details`}
    >
      <div className="w-full max-w-[min(96vw,1200px)] max-h-[85vh] overflow-y-auto rounded-card border border-border bg-bg-elev shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-fluid-0 font-medium text-text">{staff.displayName}</h2>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.72rem] font-medium text-gold">
                {ROLE_LABELS[staff.role]}
              </span>
            </div>
            <p className="text-fluid--1 text-text-muted">Commission Details & Closed Deals Statement</p>
            {referralEntries.length > 0 && (
              <button
                type="button"
                onClick={openReferralBreakdown}
                className="mt-2 inline-flex min-h-8 items-center rounded-full border border-gold/35 bg-gold/5 px-2.5 text-xs font-medium text-gold transition-colors hover:border-gold/70 hover:bg-gold/10"
              >
                Referral incentive · {formatAed(referralTotal)} · {referralEntries.length}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Summary cards */}
        <div className={`grid gap-3 p-5 ${hideProfit ? "grid-cols-2" : "grid-cols-3"}`}>
          <div className="rounded-card border border-border bg-surface-2 p-3 text-center">
            <p className="text-[0.72rem] text-text-faint">Unpaid Sales</p>
            <p className="mt-1 tabular-nums text-fluid-0 text-text">{staff.totalCarsSold}</p>
          </div>
          {!hideProfit && (
            <div className="rounded-card border border-border bg-surface-2 p-3 text-center">
              <p className="text-[0.72rem] text-text-faint">Total Profit</p>
              <p className="mt-1 tabular-nums text-fluid-0 text-text">{formatAed(staff.totalProfit)}</p>
            </div>
          )}
          <div className="rounded-card border border-gold/40 bg-gold/5 p-3 text-center">
            <p className="text-[0.72rem] text-text-faint">Commission</p>
            <p className="mt-1 tabular-nums text-fluid-0 text-gold">{formatAed(staff.totalCommission)}</p>
          </div>
        </div>

        {/* Closed-sale commission table */}
        {roleEntries.length > 0 && (
          <div className="px-5 pb-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">Closed car sales</p>
              {canPay && selectedCount > 0 && (
                <span className="text-xs font-medium text-gold">
                  {selectedCount} of {roleEntries.length} selected ({formatAed(selectedAmount)})
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3 md:hidden">
              {roleEntries.map((entry) => (
                <div key={`mobile-${entry.id}`} className="rounded-card border border-border bg-surface-2 p-4">
                  {canPay && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                      <input
                        type="checkbox"
                        id={`mobile-check-${entry.id}`}
                        checked={selectedEntryIds.has(entry.id)}
                        onChange={() => toggleEntry(entry.id)}
                        className="h-4 w-4 rounded border-border bg-surface-2 text-gold focus:ring-gold accent-gold cursor-pointer"
                      />
                      <label htmlFor={`mobile-check-${entry.id}`} className="text-xs font-medium text-text-muted cursor-pointer">
                        Select for advance payment
                      </label>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text">{entry.leadName}</p>
                      <p className="mt-1 text-sm text-text-muted">{entry.carDetails}</p>
                    </div>
                    <span className="shrink-0 tabular-nums font-medium text-gold">{formatAed(entry.commission)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <DetailMetric label="Sold date" value={formatDate(entry.soldAt)} />
                    {hasFinancialReview && <>
                      <DetailMetric label="Sold for" value={entry.financialReview?.salePrice == null ? "—" : formatAed(entry.financialReview.salePrice)} />
                      <DetailMetric label="Expenses" value={entry.financialReview ? formatAed(entry.financialReview.expenses) : "—"} />
                      <DetailMetric label="Net profit" value={entry.financialReview?.netProfit == null ? "Pending review" : formatAed(entry.financialReview.netProfit)} />
                      <DetailMetric label="Margin" value={entry.financialReview?.margin == null ? "—" : `${entry.financialReview.margin.toFixed(1)}%`} />
                    </>}
                    {!hideProfit && <DetailMetric label="Profit" value={entry.profit === null ? "—" : formatAed(entry.profit)} />}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-fluid--1">
                <thead>
                  <tr className="border-b border-border text-text-faint">
                    {canPay && (
                      <th className="py-2 pl-3 pr-2 w-10 font-normal">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all deals"
                          className="h-4 w-4 rounded border-border bg-surface-2 text-gold focus:ring-gold accent-gold cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-2 pr-4 font-normal">Customer</th>
                    <th className="py-2 pr-4 font-normal">Car</th>
                    <th className="py-2 pr-4 font-normal">Sold Date</th>
                    {hasFinancialReview && <>
                      <th className="py-2 pr-4 text-right font-normal">Sold for</th>
                      <th className="py-2 pr-4 text-right font-normal">Expenses</th>
                      <th className="py-2 pr-4 text-right font-normal">Net profit</th>
                      <th className="py-2 pr-4 text-right font-normal">Margin</th>
                    </>}
                    {!hideProfit && <th className="py-2 pr-4 text-right font-normal">Profit</th>}
                    <th className="py-2 pr-1 text-right font-normal">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {roleEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => canPay && toggleEntry(entry.id)}
                      className={`border-b border-border last:border-0 transition-colors ${
                        canPay ? "cursor-pointer hover:bg-surface-2/60" : ""
                      } ${selectedEntryIds.has(entry.id) ? "bg-gold/5" : ""}`}
                    >
                      {canPay && (
                        <td className="py-2.5 pl-3 pr-2 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.has(entry.id)}
                            onChange={() => toggleEntry(entry.id)}
                            aria-label={`Select ${entry.leadName} deal`}
                            className="h-4 w-4 rounded border-border bg-surface-2 text-gold focus:ring-gold accent-gold cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-2.5 pr-4 text-text">{entry.leadName}</td>
                      <td className="py-2.5 pr-4 text-text-muted">{entry.carDetails}</td>
                      <td className="py-2.5 pr-4 text-text-muted">{formatDate(entry.soldAt)}</td>
                      {hasFinancialReview && <>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">{entry.financialReview?.salePrice == null ? "—" : formatAed(entry.financialReview.salePrice)}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">
                          {entry.financialReview ? formatAed(entry.financialReview.expenses) : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">{entry.financialReview?.netProfit == null ? "Pending review" : formatAed(entry.financialReview.netProfit)}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">{entry.financialReview?.margin == null ? "—" : `${entry.financialReview.margin.toFixed(1)}%`}</td>
                      </>}
                      {!hideProfit && (
                        <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">
                          {entry.profit === null ? "—" : formatAed(entry.profit)}
                        </td>
                      )}
                      <td className="py-2.5 pr-1 text-right tabular-nums text-gold">
                        {formatAed(entry.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {staff.entries.length === 0 && (
          <p className="px-5 pb-4 text-fluid--1 text-text-faint">No commission entries yet for this period.</p>
        )}

        <StaffPaymentHistory payments={staff.paymentHistory} staff={staff} canDownload={canPay} />

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          {staff.totalCommission > 0 ? (
            <Button variant="outline" onClick={() => downloadStaffInvoicePdf(staff)} size="sm">
              <Download className="h-4 w-4" /> Download Invoice (PDF)
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
            {canPay && !staff.isPaidThisMonth && staff.totalCommission > 0 && (
              selectedCount > 0 ? (
                <Button
                  onClick={() => onMarkPaid(Array.from(selectedEntryIds), selectedAmount, selectedCount)}
                  size="sm"
                  className="bg-gold text-zinc-950 hover:bg-gold/90 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" /> Pay Selected ({selectedCount} · {formatAed(selectedAmount)})
                </Button>
              ) : (
                <Button onClick={() => onMarkPaid()} size="sm">
                  <CheckCircle2 className="h-4 w-4" /> Mark All as Paid ({formatAed(staff.totalCommission)})
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {showReferralBreakdown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${staff.displayName} referral breakdown`}>
          <div className="flex max-h-[75vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border bg-bg-elev shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-fluid-0 font-medium text-text">Referral incentives</h3>
                <p className="mt-1 text-sm text-text-muted">{referralEntries.length} customer{referralEntries.length === 1 ? "" : "s"} referred · {formatAed(referralTotal)}</p>
              </div>
              <button type="button" onClick={() => setShowReferralBreakdown(false)} className="rounded p-1 text-text-muted hover:text-text" aria-label="Close referral breakdown">×</button>
            </div>
            {referralEntries.length > 10 && (
              <div className="border-b border-border p-4">
                <input value={referralSearch} onChange={(event) => { setReferralSearch(event.target.value); setVisibleReferrals(10); }} placeholder="Search customer, car, or date..." className="min-h-11 w-full rounded-card border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-text-faint focus:border-gold" />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {filteredReferrals.slice(0, visibleReferrals).map((entry) => (
                <div key={entry.id} className="border-b border-border py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text">{entry.leadName}</p>
                      <p className="mt-1 text-sm text-text-muted">{entry.carDetails}</p>
                      <p className="mt-1 text-xs text-text-faint">Referred by {staff.displayName} · Sold {formatDate(entry.soldAt)}</p>
                    </div>
                    <span className="shrink-0 tabular-nums font-medium text-gold">{formatAed(entry.commission)}</span>
                  </div>
                </div>
              ))}
              {filteredReferrals.length === 0 && <p className="py-8 text-center text-sm text-text-muted">No referrals match that search.</p>}
              {visibleReferrals < filteredReferrals.length && <Button variant="outline" className="mt-4 w-full" onClick={() => setVisibleReferrals((count) => count + 10)}>Load more referrals</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-text-faint">{label}</p><p className="mt-0.5 tabular-nums text-text">{value}</p></div>;
}

// ─── Developer Commission View (pay-anytime) ────────────────────────────────

function DeveloperCommissionView({
  outstanding,
  paidToDate,
  statements,
  loading,
  onPayNow,
}: {
  outstanding: number;
  paidToDate: number;
  statements: CommissionStatement[];
  loading: boolean;
  onPayNow: () => void;
}) {
  const monthlyStatements = [...statements].sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));

  return (
    <>
      <Card className="border-gold/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-fluid--1 text-text-faint">Available to pay now</p>
            <p className="mt-1 tabular-nums text-fluid-2 text-gold">{formatAed(outstanding)}</p>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              This is the developer&apos;s {(COMMISSION_RATE * 100).toFixed(0)}% share from all unpaid sold cars. Paying every three months is recommended, but early payment is allowed anytime.
            </p>
          </div>
          {outstanding > 0 && (
            <Button onClick={onPayNow} className="w-full sm:w-auto">
              <CheckCircle2 className="h-4 w-4" /> Pay developer now
            </Button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
        <span>Paid to date: <strong className="tabular-nums text-text">{formatAed(paidToDate)}</strong></span>
        {outstanding === 0 && monthlyStatements.length > 0 && <span className="text-success">Everything recorded so far is paid.</span>}
      </div>

      {loading ? (
        <Card className="p-5">
          <p className="text-fluid--1 text-text-muted">Loading…</p>
        </Card>
      ) : monthlyStatements.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">Nothing to pay yet.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            A record appears here once a car has been sold.
          </p>
        </Card>
      ) : (
        <details className="rounded-card border border-border bg-surface-2 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-text">View monthly breakdown ({monthlyStatements.length})</summary>
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {monthlyStatements.map((statement) => (
              <li key={statement.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-3 text-sm">
                <div>
                  <span className="font-medium text-text">{formatMonth(statement.periodMonth)}</span>
                  <span className="ml-2 text-xs text-text-muted">{statement.entryCount} {statement.entryCount === 1 ? "car" : "cars"}</span>
                  {statement.carriedCount > 0 && <span className="ml-2 text-xs text-warning">Includes {statement.carriedCount} carried forward</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span className="tabular-nums text-gold">{formatAed(statement.totalCommissionAed)}</span>
                  <span>{statement.status === "paid" && statement.paidAt ? `Paid ${formatDate(statement.paidAt)}` : "Unpaid"}</span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
