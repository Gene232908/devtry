"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// A confirmation prompt for anything that changes or destroys data. Built here
// rather than pulled from a library so it inherits the admin theme and can play
// a proper exit animation — a dialog that vanishes on click feels broken, so it
// stays mounted for the length of the close animation before unmounting.

const EXIT_MS = 160;

export type ConfirmTone = "danger" | "default";

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Blocks confirm while an async action is in flight. */
  busy?: boolean;
  /** Renders above the buttons — used for the "why is this spam?" note field. */
  children?: React.ReactNode;
  /** Disables the confirm button, e.g. until a required field is filled. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  children,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: Props) {
  // Kept mounted through the exit animation, then torn down.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    timerRef.current = setTimeout(() => setMounted(false), EXIT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, mounted]);

  const requestCancel = useCallback(() => {
    if (busy) return;
    onCancel();
  }, [busy, onCancel]);

  // Escape cancels, and the body cannot scroll behind the dialog.
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestCancel();
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the primary action so the keyboard path works without a mouse.
    const focusTimer = setTimeout(() => confirmRef.current?.focus(), 60);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
    };
  }, [open, requestCancel]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm",
        closing ? "animate-overlay-out" : "animate-overlay-in",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestCancel();
      }}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-card border border-border-gold bg-surface p-6 card-shadow",
          closing ? "animate-pop-out" : "animate-pop-in",
          // Honours reduced-motion without losing the dialog itself.
          "motion-reduce:animate-none",
        )}
      >
        <button
          type="button"
          onClick={requestCancel}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-4 text-text-faint transition-colors hover:text-text disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              tone === "danger" ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1 pr-6">
            <h2 id="confirm-dialog-title" className="text-fluid-0 text-text">
              {title}
            </h2>
            {description && <div className="mt-2 text-fluid--1 leading-6 text-text-muted">{description}</div>}
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={requestCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "outline" : "gold"}
            className={tone === "danger" ? "text-danger hover:bg-danger/10" : undefined}
            onClick={onConfirm}
            loading={busy}
            disabled={busy || confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
