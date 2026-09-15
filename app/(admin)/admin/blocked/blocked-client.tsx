"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Ban, RefreshCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFreshServerData, useServerState } from "@/lib/admin/use-fresh-server-data";
import type { OtpLimitReport } from "@/lib/admin/queries";
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
  /** Present when the block came from "Mark as spam" on a lead — makes the name a link back to it. */
  source_lead_id: string | null;
  created_at: string;
};

type Suspicious = {
  phone_e164: string;
  attempts: number;
  last_attempt: string;
};

/**
 * Plain-language names for the five refusals.
 *
 * The customer-facing copy is identical for all of them on purpose — a real
 * spammer must learn nothing about which ceiling they hit. The admin is the
 * one audience that needs the difference, because "used all 5 codes today"
 * and "asked 3 times and never verified once" call for opposite responses.
 */
const LIMIT_REASON_LABEL: Record<string, string> = {
  blocklist: "On the blocklist",
  unverified_streak: "Never verifies — likely spam",
  phone_cap: "Used every code for today",
  refused: "Refused by a guard",
};

const LIMIT_REASON_TONE: Record<string, string> = {
  blocklist: "text-text-muted",
  unverified_streak: "text-danger",
  phone_cap: "text-warning",
  refused: "text-text-muted",
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

/**
 * `initialBlocked` / `initialSuspicious` come from the server render in
 * `page.tsx`, so the blocklist is on screen immediately instead of after a
 * client fetch that had to re-enter middleware. `load()` still backs Refresh
 * and the reload that follows every block/unblock.
 */
export default function BlockedNumbersClient({
  initialBlocked,
  initialSuspicious,
  initialLimits,
  initialError,
}: {
  initialBlocked: BlockedNumber[];
  initialSuspicious: Suspicious[];
  initialLimits: OtpLimitReport;
  initialError: string | null;
}) {
  // Same reason as the other server-rendered screens: without this the page can
  // show a payload rendered before the current blocklist existed.
  useFreshServerData();

  const [blocked, setBlocked] = useServerState<BlockedNumber[]>(initialBlocked);
  const [suspicious, setSuspicious] = useServerState<Suspicious[]>(initialSuspicious);
  const [limits] = useServerState<OtpLimitReport>(initialLimits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
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
    setLoading(true);

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
  }, [setBlocked, setSuspicious]);

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
              // Raised by the automatic guards, so there is no lead behind it.
              source_lead_id: null,
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
    // Header, spacing, card padding and table rhythm all mirror the Leads
    // Directory. These are sibling pages in the same dashboard; anything that
    // reads as a different design language just looks unfinished.
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Blocked Numbers</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">
          Blocked numbers are refused before any WhatsApp message is sent, so they cost nothing.
        </p>
      </div>

      {error && (
        <p className="text-fluid--1 text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Who the OTP guards actually turned away, and which ceiling they hit.
          "Too many verification requests" covers five different refusals and
          only one of them used to appear anywhere in the admin, so a number
          being refused all day was invisible — which is precisely the question
          this page exists to answer. */}
      {limits.rows.length > 0 && (
        <Card className="p-5">
          <div>
            <h2 className="text-fluid-0 text-text">Hit a limit in the last 24 hours</h2>
            <p className="mt-1 text-fluid--1 text-text-muted">
              These numbers were refused a verification code. Caps in force: {limits.caps.phone} codes per number per
              day, {limits.caps.unverified} unverified in a row.
            </p>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-fluid--1">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="py-2 pr-4 font-normal whitespace-nowrap">Number</th>
                  <th className="py-2 pr-4 font-normal whitespace-nowrap">Why</th>
                  <th className="py-2 pr-4 text-right font-normal whitespace-nowrap">Codes sent</th>
                  <th className="py-2 pr-4 text-right font-normal whitespace-nowrap">Never verified</th>
                  <th className="py-2 pr-4 text-right font-normal whitespace-nowrap">Refused</th>
                  <th className="py-2 pr-4 text-right font-normal whitespace-nowrap">Wrong codes</th>
                  <th className="py-2 pr-1 text-right font-normal whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {limits.rows.map((row) => (
                  <tr key={row.phone_e164} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 tabular-nums text-text whitespace-nowrap">{row.phone_e164}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className={LIMIT_REASON_TONE[row.reason ?? "refused"]}>
                        {LIMIT_REASON_LABEL[row.reason ?? "refused"]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted whitespace-nowrap">
                      {row.sends}/{limits.caps.phone}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted whitespace-nowrap">{row.unverified}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-warning whitespace-nowrap">{row.refusedSends}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-text-muted whitespace-nowrap">{row.failedVerifies}</td>
                    <td className="py-3 pl-2 pr-1 text-right whitespace-nowrap">
                      {row.reason === "blocklist" ? (
                        <span className="text-text-faint">Blocked</span>
                      ) : (
                        <Button
                          variant="outline"
                          className="px-3"
                          disabled={busy === row.phone_e164}
                          onClick={() => ask({ kind: "block", phone: row.phone_e164 })}
                        >
                          <Ban className="h-4 w-4" /> Block
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {suspicious.length > 0 && (
        <Card className="p-5">
          <div>
            <h2 className="text-fluid-0 text-text">Suspicious in the last 24 hours</h2>
            <p className="mt-1 text-fluid--1 text-text-muted">
              Requested a code three or more times and never verified once. Not blocked — review before acting, a
              real customer can trip this by mistake.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-2">
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
        <Card className="p-5">
          <p className="text-fluid--1 text-text-muted">Loading…</p>
        </Card>
      ) : blocked.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-fluid-0 text-text">No blocked numbers.</p>
          <p className="mt-1 text-fluid--1 text-text-muted">
            Use “Mark as spam” on a lead, or block a number from the list above.
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-fluid--1 text-text-muted">
              {blocked.length} blocked {blocked.length === 1 ? "number" : "numbers"}
            </p>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-fluid--1">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="py-2 pr-4 font-normal whitespace-nowrap">Client Name</th>
                  <th className="py-2 pr-4 font-normal whitespace-nowrap">Number</th>
                  <th className="py-2 pr-4 font-normal whitespace-nowrap">Reason</th>
                  <th className="py-2 pr-4 font-normal whitespace-nowrap">Blocked</th>
                  <th className="py-2 pr-1 font-normal text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((row) => (
                  <tr key={row.phone_e164} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="py-3 pr-4">
                      {/* Linked back to the lead it was blocked from, where there
                          is one — a block raised from the automatic guards has no
                          lead behind it, so there is nowhere to go. */}
                      {row.source_lead_id ? (
                        <Link href={`/admin/leads/${row.source_lead_id}`} className="text-text hover:text-gold">
                          {row.full_name || "Unnamed contact"}
                        </Link>
                      ) : (
                        <span className="text-text-muted">{row.full_name || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-text-muted whitespace-nowrap">{row.phone_e164}</td>
                    <td className="py-3 pr-4 text-text-muted">
                      {REASON_LABELS[row.reason] ?? row.reason}
                      {row.note && <span className="block text-text-faint">{row.note}</span>}
                    </td>
                    <td className="py-3 pr-4 text-text-muted whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="py-3 pl-2 pr-1 text-right whitespace-nowrap">
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
          </div>
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
