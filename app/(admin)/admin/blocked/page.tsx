"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, RefreshCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoBlockedNumbers, demoSuspiciousNumbers } from "@/config/demo-admin-data";

// Numbers that are refused before any WhatsApp message is sent, so a blocked
// sender costs nothing. Also surfaces numbers that tripped the automatic OTP
// guards recently — those are shown as suggestions only and are never blocked
// automatically, because a real customer can hit a cap by accident.

type BlockedNumber = {
  phone_e164: string;
  reason: string;
  note: string | null;
  full_name: string | null;
  created_at: string;
};

type Suspicious = {
  phone_e164: string;
  attempts: number;
  last_attempt: string;
};

const REASON_LABELS: Record<string, string> = {
  manual_spam: "Marked as spam",
  otp_abuse: "Code request abuse",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BlockedNumbersPage() {
  const [blocked, setBlocked] = useState<BlockedNumber[]>([]);
  const [suspicious, setSuspicious] = useState<Suspicious[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Both blocking and unblocking change who can reach the business, so neither
  // happens on a single click. `pending` deliberately survives the dialog's
  // exit animation: clearing it on close made the closing dialog fall back to
  // the other action's wording for ~160ms, which read as a second, different
  // warning appearing.
  const [pending, setPending] = useState<{ kind: "block" | "unblock"; phone: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function ask(action: { kind: "block" | "unblock"; phone: string }) {
    setPending(action);
    setDialogOpen(true);
  }

  const load = useCallback(async () => {
    setError(null);

    // Milestone 2: design preview — demo rows only, so the real blocklist is
    // never exposed and never altered from a walkthrough.
    if (ADMIN_PREVIEW) {
      setBlocked(demoBlockedNumbers);
      setSuspicious(demoSuspiciousNumbers);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/blocked-numbers", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? "Couldn't load the blocklist.");
        return;
      }
      setBlocked(body.data.blocked ?? []);
      setSuspicious(body.data.recentSuspicious ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function blockNumber(phone: string, reason: string, note: string) {
    setBusy(phone);
    try {
      const res = await fetch("/api/admin/blocked-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, reason, note }),
      });
      if (res.ok) await load();
    } catch {
      // non-fatal
    } finally {
      setBusy(null);
    }
  }

  async function unblock(phone: string) {
    setBusy(phone);
    try {
      const res = await fetch("/api/admin/blocked-numbers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) setBlocked((current) => current.filter((b) => b.phone_e164 !== phone));
    } catch {
      // non-fatal
    } finally {
      setBusy(null);
    }
  }

  async function runPending() {
    if (!pending) return;

    // Milestone 2: nothing is written. The lists update so the flow can be
    // demonstrated, but no number is actually blocked or unblocked.
    if (ADMIN_PREVIEW) {
      if (pending.kind === "block") {
        const row = suspicious.find((s) => s.phone_e164 === pending.phone);
        setSuspicious((current) => current.filter((s) => s.phone_e164 !== pending.phone));
        if (row) {
          setBlocked((current) => [
            {
              phone_e164: row.phone_e164,
              reason: "otp_abuse",
              note: "Blocked after repeated unverified code requests.",
              full_name: null,
              created_at: new Date().toISOString(),
            },
            ...current,
          ]);
        }
      } else {
        setBlocked((current) => current.filter((b) => b.phone_e164 !== pending.phone));
      }
      setDialogOpen(false);
      return;
    }

    if (pending.kind === "block") {
      await blockNumber(pending.phone, "otp_abuse", "Blocked after repeated unverified code requests.");
    } else {
      await unblock(pending.phone);
    }
    setDialogOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-fluid-2 font-light text-text">Blocked Numbers</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Blocked numbers are refused before any WhatsApp message is sent, so they cost nothing.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      {suspicious.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div>
            <h2 className="text-fluid-0 text-text">Suspicious in the last 24 hours</h2>
            <p className="mt-1 text-fluid--1 text-text-muted">
              Requested a code three or more times and never verified once. Not blocked — review before acting, a
              real customer can trip this by mistake.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {suspicious.map((row) => (
              <div
                key={row.phone_e164}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border px-4 py-3"
              >
                <div>
                  <p className="text-text">{row.phone_e164}</p>
                  <p className="text-fluid--1 text-text-faint">
                    {row.attempts} requests · last {formatDate(row.last_attempt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="text-danger hover:bg-danger/10"
                  disabled={busy === row.phone_e164}
                  onClick={() => ask({ kind: "block", phone: row.phone_e164 })}
                >
                  <Ban className="h-4 w-4" /> Block
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-fluid--1 text-text-muted">Loading…</p>
      ) : blocked.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">No blocked numbers.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Use “Mark as spam” on a lead, or block a number from the list above.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] border-collapse text-fluid--1">
            <thead>
              <tr className="border-b border-border text-left text-text-faint">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Blocked</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blocked.map((row) => (
                <tr key={row.phone_e164} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-text">{row.phone_e164}</td>
                  <td className="px-4 py-3 text-text-muted">{row.full_name || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {REASON_LABELS[row.reason] ?? row.reason}
                    {row.note && <span className="block text-text-faint">{row.note}</span>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      className="px-3"
                      disabled={busy === row.phone_e164}
                      onClick={() => ask({ kind: "unblock", phone: row.phone_e164 })}
                      title="Allow this number to request codes again"
                    >
                      <ShieldOff className="h-4 w-4" /> Unblock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={pending?.kind === "block" ? "Block this number?" : "Unblock this number?"}
        description={
          pending?.kind === "block" ? (
            <>
              <span className="text-text">{pending?.phone}</span> will be refused before any WhatsApp message is
              sent, so it can never cost another billed message. You can undo this at any time.
            </>
          ) : (
            <>
              <span className="text-text">{pending?.phone}</span> will be able to request verification codes again,
              and each delivered code is billed. Only do this if you believe the block was a mistake.
            </>
          )
        }
        confirmLabel={pending?.kind === "block" ? "Block number" : "Unblock number"}
        cancelLabel="Cancel"
        busy={busy !== null}
        onConfirm={() => void runPending()}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
