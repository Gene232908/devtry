"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Stays mounted for the length of its exit animation before unmounting. A
// dialog that vanishes the instant its `open` prop flips reads as a glitch —
// especially in the valuation flow, where one dialog closing is immediately
// followed by another opening.

const EXIT_MS = 160;

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Hides the close button for steps the visitor should not dismiss mid-flight. */
  hideClose?: boolean;
  /** When true, the children provide their own custom header and close button. */
  customHeader?: boolean;
};

export function Dialog({ open, onClose, title, children, className, hideClose, customHeader }: DialogProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3 sm:p-6",
        closing ? "animate-overlay-out" : "animate-overlay-in",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full justify-center">
        <div
          className={cn(
            "relative my-auto w-full max-w-md rounded-card border border-border-gold/70 bg-bg-elev/95 p-6 card-shadow",
            closing ? "animate-pop-out" : "animate-pop-in",
            "motion-reduce:animate-none",
            className,
          )}
        >
          {!customHeader && (title || !hideClose) && (
            <div className="mb-4 flex items-center justify-between">
              {title && <h3 className="font-display text-fluid-2 text-text">{title}</h3>}
              {!hideClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="ml-auto rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
