"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { X, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCookieConsent } from "./CookieConsentContext";

export function CookiePreferencesModal() {
  const {
    showPreferences,
    closePreferences,
    consent,
    acceptAll,
    rejectOptional,
  } = useCookieConsent();

  const titleId = useId();

  // Handle escape key and scroll lock
  useEffect(() => {
    if (!showPreferences) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePreferences();
    }

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [showPreferences, closePreferences]);

  if (!showPreferences) return null;

  const isAccepted = Boolean(consent?.categories.analytics || consent?.categories.marketing);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={closePreferences}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#121110] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 text-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gold" aria-hidden="true" />
            <h2 id={titleId} className="font-display text-base font-semibold text-text">
              Cookie Preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Close"
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Practical Description */}
        <div className="py-4 space-y-3">
          <p className="text-xs font-light leading-relaxed text-text-muted">
            We use cookies to process your inquiry and ensure the valuation form works smoothly.
          </p>

          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <span className="text-xs text-text-muted">Current status:</span>
            <span className={`text-xs font-medium flex items-center gap-1 ${isAccepted ? "text-gold" : "text-text-muted"}`}>
              {isAccepted ? (
                <>
                  <Check className="h-3 w-3" />
                  Cookies Allowed
                </>
              ) : (
                "Optional Cookies Declined"
              )}
            </span>
          </div>

          <p className="text-[11px] text-text-faint">
            Read our{" "}
            <Link
              href="/privacy"
              onClick={closePreferences}
              className="text-text-muted underline underline-offset-2 hover:text-gold"
            >
              Privacy Policy
            </Link>{" "}
            for full details on data processing.
          </p>
        </div>

        {/* Clean Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={rejectOptional}
            className="text-xs h-8 px-3 text-text-muted hover:text-text"
          >
            Decline
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={acceptAll}
            className="text-xs h-8 px-4 font-medium"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
