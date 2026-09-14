"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CatalogToast({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-card border border-gold/45 bg-surface px-4 py-3 text-fluid--1 text-text shadow-[0_16px_40px_rgba(0,0,0,0.45)] animate-fade-in sm:max-w-md"
    >
      <span
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gold"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="leading-5">{message}</p>
        {actionLabel && onAction && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 px-1 text-gold"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="shrink-0 text-text-faint transition-colors hover:text-text"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
