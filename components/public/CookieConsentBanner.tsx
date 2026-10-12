"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useCookieConsent } from "./CookieConsentContext";

export function CookieConsentBanner() {
  const { showBanner, acceptAll, rejectOptional } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      role="region"
      className="fixed bottom-3 left-3 right-3 z-50 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="rounded-xl border border-white/10 bg-[#121110]/95 p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl text-text">
        <h2 className="font-display text-sm sm:text-base font-semibold text-text">
          Cookie &amp; Privacy Notice
        </h2>

        <p className="mt-1.5 text-xs font-light leading-relaxed text-text-muted">
          By accepting this, you acknowledge that CarVibe Dubai will process the information you provide to respond to your inquiry and handle your request. Please review our{" "}
          <Link
            href="/privacy"
            className="text-gold underline underline-offset-2 hover:text-gold-hi transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          for details about how your personal data is handled.
        </p>

        <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={rejectOptional}
            className="text-xs h-8 px-3.5 text-text-muted hover:text-text hover:border-white/30"
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
    </aside>
  );
}
