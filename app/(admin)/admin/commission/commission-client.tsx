"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Download, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatAed, formatDate } from "@/lib/format";
import { useFreshServerData, useServerState } from "@/lib/admin/use-fresh-server-data";
import { COMMISSION_RATE } from "@/lib/admin/inventory";
import {
  formatMonth,
  groupIntoQuarters,
  type CommissionStatement,
  type Quarter,
  type StaffCommission,
} from "@/lib/admin/commission";
import { downloadStaffInvoicePdf } from "@/lib/admin/pdf-invoice";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoCommissionStatements } from "@/config/demo-admin-data";

import { useStaffIdentity } from "@/lib/admin/staff-identity-context";

// ─── Types ─────────────────────────────────────────────────────────────────

type CommissionTab = "agents" | "purchasers" | "developer";

const TAB_LABELS: Record<CommissionTab, string> = {
  agents: "Agents",
  purchasers: "Purchasers",
  developer: "Developer",
};

const PAGE_TITLES: Record<CommissionTab, string> = {
  agents: "Agent Commission",
  purchasers: "Purchaser Commission",
  developer: "Developer Commission",
};

const PAGE_DESCRIPTIONS: Record<CommissionTab, string> = {
  agents: "Commission earned by call center agents for deals closed with customers (2% of profit per car).",
  purchasers: "Commission earned by purchasers for deals closed with customers (10% of profit per car).",
  developer: "Developer commission earned on all sold vehicles (2% of profit per car).",
};

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
      { id: "e1", leadName: "Ahmad Hassan", carDetails: "2022 BMW X5", soldAt: "2026-09-02", profit: 18000, commission: 360 },
      { id: "e2", leadName: "Sara Ali", carDetails: "2023 Mercedes GLC", soldAt: "2026-09-05", profit: 22000, commission: 440 },
      { id: "e3", leadName: "Omar Khalid", carDetails: "2021 Range Rover Sport", soldAt: "2026-08-28", profit: 15000, commission: 300 },
    ],
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
      { id: "e4", leadName: "Khalid Noor", carDetails: "2022 Toyota Land Cruiser", soldAt: "2026-09-01", profit: 25000, commission: 500 },
      { id: "e5", leadName: "Layla Mohammed", carDetails: "2023 Audi Q7", soldAt: "2026-09-04", profit: 20000, commission: 400 },
    ],
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
      { id: "e6", leadName: "Rashed Abdullah", carDetails: "2023 Porsche Cayenne", soldAt: "2026-09-03", profit: 32000, commission: 3200 },
      { id: "e7", leadName: "Nadia Yusuf", carDetails: "2022 Lexus RX", soldAt: "2026-08-30", profit: 16000, commission: 1600 },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommissionClient({
  initialStatements,
  initialError,
  initialAgents,
  initialPurchasers,
}: {
  initialStatements: CommissionStatement[];
  initialError: string | null;
  initialAgents?: StaffCommission[];
  initialPurchasers?: StaffCommission[];
}) {
  useFreshServerData();
  const identity = useStaffIdentity();

  const [activeTab, setActiveTab] = useState<CommissionTab>("agents");
  const [tabMenuOpen, setTabMenuOpen] = useState(false);

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

  // Developer commission (existing quarterly system)
  const [statements, setStatements] = useServerState<CommissionStatement[]>(initialStatements);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Detail view
  const [detailTarget, setDetailTarget] = useState<StaffCommission | null>(null);

  // Pay confirmation
  const [payTarget, setPayTarget] = useState<{ staff: StaffCommission; tab: CommissionTab } | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Developer pay confirmation
  const [devPayTarget, setDevPayTarget] = useState<Quarter | null>(null);
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
      }
    } catch {
      // Non-fatal
    }
  }, [setAgents, setPurchasers]);

  // ─── Pay handlers ─────────────────────────────────────────────────────────

  async function handlePayStaff() {
    if (!payTarget) return;
    setPayBusy(true);
    setPayError(null);

    if (ADMIN_PREVIEW) {
      const now = new Date().toISOString();
      const updateFn = (prev: StaffCommission[]) =>
        prev.map((s) =>
          s.id === payTarget.staff.id
            ? { ...s, isPaidThisMonth: true, paidAt: now, totalCarsSold: 0, totalProfit: 0, totalCommission: 0 }
            : s,
        );

      if (payTarget.tab === "agents") setAgents(updateFn);
      else setPurchasers(updateFn);

      setPayBusy(false);
      setPayTarget(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/commission/staff/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: payTarget.staff.id }),
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

  async function handlePayDeveloperQuarter() {
    if (!devPayTarget) return;
    setDevPayBusy(true);
    setDevPayError(null);

    const ids = devPayTarget.months
      .filter((m) => m.status !== "paid")
      .map((m) => m.id);

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

  const quarters = useMemo(() => groupIntoQuarters(statements), [statements]);
  const devOutstanding = useMemo(
    () => statements.filter((s) => s.status !== "paid").reduce((n, s) => n + s.totalCommissionAed, 0),
    [statements],
  );
  const devPaid = useMemo(
    () => statements.filter((s) => s.status === "paid").reduce((n, s) => n + s.totalCommissionAed, 0),
    [statements],
  );

  // ─── Computed summaries ───────────────────────────────────────────────────

  const agentOutstanding = agents.reduce((n, a) => n + a.totalCommission, 0);
  const purchaserOutstanding = purchasers.reduce((n, a) => n + a.totalCommission, 0);

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

  const pageTitle = isStaffSelfViewer
    ? "My Commission"
    : PAGE_TITLES[activeTab];

  const pageDesc = isAgentViewer
    ? "Track your earnings and download statement invoices for your closed deals (2% of profit per car)."
    : isPurchaserViewer
    ? "Track your earnings and download statement invoices for your closed deals (10% of profit per car)."
    : PAGE_DESCRIPTIONS[activeTab];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-fluid-3 text-text">{pageTitle}</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">{pageDesc}</p>
        </div>

        {/* Tab selector (Super Admin only) */}
        {!isStaffSelfViewer && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setTabMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-fluid--1 text-text hover:bg-surface-2/80 transition-colors"
            >
              {TAB_LABELS[activeTab]}
              <ChevronDown className="h-4 w-4 text-text-muted" />
            </button>
            {tabMenuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-card border border-border bg-surface py-1 card-shadow animate-fade-in">
                {(Object.keys(TAB_LABELS) as CommissionTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setTabMenuOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-fluid--1 transition-colors ${
                      activeTab === tab ? "bg-gold/10 text-gold" : "text-text hover:bg-surface-2"
                    }`}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
          tab="agents"
          isStaffSelf={true}
          onViewDetails={setDetailTarget}
          onMarkPaid={() => {}}
        />
      )}

      {isPurchaserViewer && (
        <StaffCommissionView
          totalOutstanding={myPurchaserList.reduce((n, a) => n + a.totalCommission, 0)}
          staffList={myPurchaserList}
          tab="purchasers"
          isStaffSelf={true}
          onViewDetails={setDetailTarget}
          onMarkPaid={() => {}}
        />
      )}

      {/* ─── Super Admin Multi-Tab View ─────────────────────────────────── */}
      {!isStaffSelfViewer && activeTab === "agents" && (
        <StaffCommissionView
          totalOutstanding={agentOutstanding}
          staffList={agents}
          tab="agents"
          onViewDetails={setDetailTarget}
          onMarkPaid={(staff) => {
            setPayError(null);
            setPayTarget({ staff, tab: "agents" });
          }}
        />
      )}

      {!isStaffSelfViewer && activeTab === "purchasers" && (
        <StaffCommissionView
          totalOutstanding={purchaserOutstanding}
          staffList={purchasers}
          tab="purchasers"
          onViewDetails={setDetailTarget}
          onMarkPaid={(staff) => {
            setPayError(null);
            setPayTarget({ staff, tab: "purchasers" });
          }}
        />
      )}

      {!isStaffSelfViewer && activeTab === "developer" && (
        <DeveloperCommissionView
          outstanding={devOutstanding}
          paidToDate={devPaid}
          quarters={quarters}
          loading={loading}
          onMarkPaid={(q) => {
            setDevPayError(null);
            setDevPayTarget(q);
          }}
        />
      )}

      <div>
        <Button
          variant="outline"
          onClick={() => {
            if (activeTab === "developer") void loadDeveloperStatements();
            else void loadStaffCommission();
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ─── Detail modal ─────────────────────────────────────────────── */}
      {detailTarget && (
        <StaffDetailModal
          staff={detailTarget}
          canPay={!isStaffSelfViewer}
          onClose={() => setDetailTarget(null)}
          onMarkPaid={() => {
            setPayError(null);
            setPayTarget({ staff: detailTarget, tab: activeTab as "agents" | "purchasers" });
          }}
        />
      )}

      {/* ─── Staff pay confirmation ───────────────────────────────────── */}
      <ConfirmDialog
        open={payTarget !== null}
        title="Mark as Paid?"
        description={
          payTarget ? (
            <>
              This will mark <span className="text-text">{payTarget.staff.displayName}</span>&apos;s commission of{" "}
              <span className="text-gold">{formatAed(payTarget.staff.totalCommission)}</span> as paid for this month.
              Their totals will reset to 0 for the next period.
            </>
          ) : null
        }
        confirmLabel="Mark as Paid"
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
        title="Mark Quarter as Paid?"
        description={
          devPayTarget ? (
            <>
              This records <span className="text-gold">{formatAed(devPayTarget.totalCommissionAed)}</span> for{" "}
              {devPayTarget.label} as settled. It cannot be undone from here.
            </>
          ) : null
        }
        confirmLabel="Mark as Paid"
        cancelLabel="Cancel"
        busy={devPayBusy}
        onConfirm={() => void handlePayDeveloperQuarter()}
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
  tab,
  isStaffSelf,
  onViewDetails,
  onMarkPaid,
}: {
  totalOutstanding: number;
  staffList: StaffCommission[];
  tab: CommissionTab;
  isStaffSelf?: boolean;
  onViewDetails: (staff: StaffCommission) => void;
  onMarkPaid: (staff: StaffCommission) => void;
}) {
  // A self-viewer's list is always exactly them — "Total Staff: 1" tells an
  // agent or purchaser nothing they didn't already know. What they actually
  // want next to their outstanding balance is how many cars that balance came
  // from, so the owner's cross-staff table keeps the staff count and the
  // individual view gets a total that means something to the person reading it.
  const totalCarsSold = staffList.reduce((n, s) => n + s.totalCarsSold, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-gold/40 p-4">
          <p className="text-fluid--1 text-text-faint">Total Outstanding</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-gold">{formatAed(totalOutstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-fluid--1 text-text-faint">{isStaffSelf ? "Total Cars Sold" : "Total Staff"}</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-text">
            {isStaffSelf ? totalCarsSold : staffList.length}
          </p>
        </Card>
      </div>

      {staffList.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">No {tab} found.</p>
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
            <table className="w-full min-w-[640px] table-fixed text-left text-fluid--1">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="w-[20%] py-2 pr-4 font-normal">Name</th>
                  <th className="w-[12%] py-2 pr-4 text-right font-normal">Cars Sold</th>
                  <th className="w-[16%] py-2 pr-4 text-right font-normal">Total Profit</th>
                  {/* Extra right padding (pr-8, not pr-4) on purpose: this
                      column is right-aligned and the next one is left-aligned,
                      so their content would otherwise sit directly against
                      each other with nothing but the column boundary between
                      "AED 400" and "Unpaid". The padding pulls the number back
                      from that boundary to open up real breathing room. */}
                  <th className="w-[18%] py-2 pr-8 text-right font-normal">
                    Commission ({tab === "agents" ? "2%" : "10%"})
                  </th>
                  <th className="w-[12%] py-2 pr-4 font-normal">Status</th>
                  <th className="w-[22%] py-2 pr-1 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-text font-medium">{staff.displayName}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{staff.totalCarsSold}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted">{formatAed(staff.totalProfit)}</td>
                    <td className="py-3 pr-8 text-right tabular-nums text-gold">{formatAed(staff.totalCommission)}</td>
                    <td className="py-3 pr-4">
                      {staff.isPaidThisMonth ? (
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
                        <Button size="sm" variant="outline" onClick={() => downloadStaffInvoicePdf(staff)}>
                          <Download className="h-3.5 w-3.5" /> Invoice
                        </Button>
                        {/* Owner-only: an agent or purchaser can see and download
                            their own statement, but only the owner decides money
                            has actually left the business. */}
                        {!isStaffSelf && !staff.isPaidThisMonth && staff.totalCommission > 0 && (
                          <Button size="sm" onClick={() => onMarkPaid(staff)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Pay
                          </Button>
                        )}
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

// ─── Staff Detail Modal ─────────────────────────────────────────────────────

function StaffDetailModal({
  staff,
  canPay,
  onClose,
  onMarkPaid,
}: {
  staff: StaffCommission;
  /** False for an agent or purchaser viewing their own detail — they can see
   *  and download this statement, but only the owner settles it. */
  canPay: boolean;
  onClose: () => void;
  onMarkPaid: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${staff.displayName} commission details`}
    >
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-card border border-border bg-bg-elev shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-fluid-0 font-medium text-text">{staff.displayName}</h2>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.72rem] font-medium text-gold">
                {staff.role === "call_center" ? "Agent (2%)" : "Purchaser (10%)"}
              </span>
            </div>
            <p className="text-fluid--1 text-text-muted">Commission Details &amp; Closed Deals Statement</p>
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
        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="rounded-card border border-border bg-surface-2 p-3 text-center">
            <p className="text-[0.72rem] text-text-faint">Cars Sold</p>
            <p className="mt-1 tabular-nums text-fluid-0 text-text">{staff.totalCarsSold}</p>
          </div>
          <div className="rounded-card border border-border bg-surface-2 p-3 text-center">
            <p className="text-[0.72rem] text-text-faint">Total Profit</p>
            <p className="mt-1 tabular-nums text-fluid-0 text-text">{formatAed(staff.totalProfit)}</p>
          </div>
          <div className="rounded-card border border-gold/40 bg-gold/5 p-3 text-center">
            <p className="text-[0.72rem] text-text-faint">Commission</p>
            <p className="mt-1 tabular-nums text-fluid-0 text-gold">{formatAed(staff.totalCommission)}</p>
          </div>
        </div>

        {/* Entries table */}
        {staff.entries.length > 0 && (
          <div className="px-5 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-fluid--1">
                <thead>
                  <tr className="border-b border-border text-text-faint">
                    <th className="py-2 pr-4 font-normal">Customer</th>
                    <th className="py-2 pr-4 font-normal">Car</th>
                    <th className="py-2 pr-4 font-normal">Sold Date</th>
                    <th className="py-2 pr-4 text-right font-normal">Profit</th>
                    <th className="py-2 pr-1 text-right font-normal">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 text-text">{entry.leadName}</td>
                      <td className="py-2.5 pr-4 text-text-muted">{entry.carDetails}</td>
                      <td className="py-2.5 pr-4 text-text-muted">{formatDate(entry.soldAt)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-text-muted">
                        {formatAed(entry.profit)}
                      </td>
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

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={() => downloadStaffInvoicePdf(staff)} size="sm">
            <Download className="h-4 w-4" /> Download Invoice (PDF)
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
            {canPay && !staff.isPaidThisMonth && staff.totalCommission > 0 && (
              <Button onClick={onMarkPaid} size="sm">
                <CheckCircle2 className="h-4 w-4" /> Mark as Paid
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Developer Commission View (simplified quarterly) ───────────────────────

const QUARTER_TONE: Record<Quarter["status"], string> = {
  draft: "text-text-muted",
  partial: "text-warning",
  issued: "text-info",
  paid: "text-success",
};

const QUARTER_LABEL: Record<Quarter["status"], string> = {
  draft: "Unpaid",
  partial: "Partly paid",
  issued: "Awaiting payment",
  paid: "Paid",
};

function DeveloperCommissionView({
  outstanding,
  paidToDate,
  quarters,
  loading,
  onMarkPaid,
}: {
  outstanding: number;
  paidToDate: number;
  quarters: Quarter[];
  loading: boolean;
  onMarkPaid: (quarter: Quarter) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-gold/40 p-4">
          <p className="text-fluid--1 text-text-faint">Outstanding</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-gold">{formatAed(outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-fluid--1 text-text-faint">Paid to Date</p>
          <p className="mt-1.5 tabular-nums text-fluid-1 text-text">{formatAed(paidToDate)}</p>
        </Card>
      </div>

      <p className="text-fluid--1 text-text-muted">
        The developer&apos;s {(COMMISSION_RATE * 100).toFixed(0)}% share of the profit on every car sold.
        Recorded monthly, paid every three months.
      </p>

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
                <table className="w-full min-w-[500px] text-left text-fluid--1">
                  <thead>
                    <tr className="border-b border-border text-text-faint">
                      <th className="py-2 pr-4 font-normal">Month</th>
                      <th className="py-2 pr-4 text-right font-normal">Cars sold</th>
                      <th className="py-2 pr-4 text-right font-normal">Profit</th>
                      <th className="py-2 pr-4 text-right font-normal">Share ({(COMMISSION_RATE * 100).toFixed(0)}%)</th>
                      <th className="py-2 pr-1 font-normal"></th>
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
                          {m.paidAt && <span className="block text-text-faint">Paid {formatDate(m.paidAt)}</span>}
                          {m.carriedCount > 0 && (
                            <span className="block text-warning">
                              includes {m.carriedCount} carried forward
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {q.status !== "paid" && (
                <div className="mt-5 border-t border-border pt-4">
                  <Button onClick={() => onMarkPaid(q)}>
                    <CheckCircle2 className="h-4 w-4" /> Mark Quarter as Paid
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
