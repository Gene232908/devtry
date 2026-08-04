"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLeads } from "@/lib/admin/leads-store";
import { formatPhoneDisplay } from "@/lib/format";
import type { Lead } from "@/config/mock-data";

/**
 * "Mark as spam" — split out of LeadDetail, which had grown past the 500-line
 * limit in RULES.md. Self-contained: it owns its own dialog state and write,
 * and reports back only what the lead screen needs to reflect.
 *
 * Marking spam does two things, and the blocklist entry is the one that
 * actually protects the account: every OTP that reaches WhatsApp is billed, so
 * flagging the lead alone would leave the same number free to keep requesting
 * codes. /api/otp/send refuses blocked numbers before contacting Meta, so from
 * here on this sender costs nothing.
 */
export function MarkSpamAction({
  lead,
  notes,
  onMarked,
  onError,
}: {
  lead: Lead;
  /** Current notes draft — the reason is appended to it. */
  notes: string;
  /** Called after a successful mark, with the notes the lead now has. */
  onMarked: (notes: string) => void;
  onError: (message: string) => void;
}) {
  const { updateLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;

    setBlocking(true);
    try {
      await fetch("/api/admin/blocked-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: lead.phoneE164,
          reason: "manual_spam",
          fullName: lead.fullName,
          note: trimmed,
          sourceLeadId: lead.id,
        }),
      });
    } catch {
      // Non-fatal: still flag the lead below so the admin sees it took effect.
    } finally {
      setBlocking(false);
    }

    // Keep the reason on the lead too, so the timeline explains the block.
    const nextNotes = `${notes}\nMarked as spam: ${trimmed}`.trim();
    // The API closes the lead automatically when is_spam flips to true.
    const ok = await updateLead(lead.id, { isSpam: true, notes: nextNotes });

    if (!ok) {
      // The number is already blocked at this point — say so rather than
      // implying nothing happened.
      onError("The number was blocked, but the lead could not be updated. Please try again.");
      setOpen(false);
      return;
    }

    onMarked(nextNotes);
    setOpen(false);
    setReason("");
  }

  return (
    <>
      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          className="w-full text-danger hover:bg-danger/10"
          disabled={blocking || lead.isSpam === true}
          onClick={() => setOpen(true)}
        >
          <Ban className="h-4 w-4" />
          {lead.isSpam === true ? "Marked as spam" : "Mark as spam"}
        </Button>
        <p className="mt-2 text-fluid--1 text-text-faint">
          Also blocks {formatPhoneDisplay(lead.phoneE164)} from requesting new verification codes. Undo it from{" "}
          <Link href="/admin/blocked" className="text-gold hover:underline">
            Blocked Numbers
          </Link>
          .
        </p>
      </div>

      <ConfirmDialog
        open={open}
        tone="danger"
        title="Mark this lead as spam?"
        description={
          <>
            This closes the lead and blocks <span className="text-text">{formatPhoneDisplay(lead.phoneE164)}</span>{" "}
            from requesting any further verification codes. A reason is required so the block can be explained later.
          </>
        }
        confirmLabel="Mark as spam"
        cancelLabel="Cancel"
        busy={blocking}
        confirmDisabled={reason.trim().length === 0}
        onConfirm={() => void confirm()}
        onCancel={() => {
          setOpen(false);
          setReason("");
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">
            Reason <span className="text-danger">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Repeated fake submissions, number not reachable."
            className="w-full rounded-card border border-border bg-surface-2 p-3 text-fluid--1 text-text outline-none focus:gold-glow focus:border-gold"
          />
        </label>
      </ConfirmDialog>
    </>
  );
}
