"use client";

import { CookieConsentBanner } from "./CookieConsentBanner";
import { CookiePreferencesModal } from "./CookiePreferencesModal";

/**
 * Public Cookie Consent UI bundle.
 * Renders the floating bottom banner when unconsented and the customization
 * modal dialog when requested.
 */
export function CookieConsent() {
  return (
    <>
      <CookieConsentBanner />
      <CookiePreferencesModal />
    </>
  );
}
