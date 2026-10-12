"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_EVENT,
  getStoredConsent,
  OPEN_PREFERENCES_EVENT,
  saveConsent,
  type ConsentPreferencesInput,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";

type CookieConsentContextValue = {
  /** The current valid consent record, or null if not yet determined/unconsented. */
  consent: CookieConsentRecord | null;
  /** Whether client-side localStorage check has completed. */
  isReady: boolean;
  /** Whether the floating banner should be displayed. */
  showBanner: boolean;
  /** Whether the detailed customization modal is open. */
  showPreferences: boolean;
  /** Accepts all optional cookies (Analytics + Marketing). */
  acceptAll: () => void;
  /** Rejects all optional cookies (Necessary only). */
  rejectOptional: () => void;
  /** Saves custom selection of optional categories. */
  savePreferences: (preferences: ConsentPreferencesInput) => void;
  /** Opens the preferences dialog. */
  openPreferences: () => void;
  /** Closes the preferences dialog. */
  closePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Read stored consent once on mount to avoid layout shift or banner flash
  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);
    setIsReady(true);

    function onConsentUpdated(e: Event) {
      const customEvent = e as CustomEvent<CookieConsentRecord>;
      if (customEvent.detail) {
        setConsent(customEvent.detail);
      }
    }

    function onOpenPreferences() {
      setShowPreferences(true);
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentUpdated);
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpenPreferences);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentUpdated);
      window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpenPreferences);
    };
  }, []);

  const acceptAll = useCallback(() => {
    const updated = saveConsent({ analytics: true, marketing: true });
    setConsent(updated);
    setShowPreferences(false);
  }, []);

  const rejectOptional = useCallback(() => {
    const updated = saveConsent({ analytics: false, marketing: false });
    setConsent(updated);
    setShowPreferences(false);
  }, []);

  const savePreferences = useCallback((preferences: ConsentPreferencesInput) => {
    const updated = saveConsent(preferences);
    setConsent(updated);
    setShowPreferences(false);
  }, []);

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);

  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  // Suppress banner for admin pages and while client verification is pending
  const isAdminRoute = Boolean(pathname?.startsWith("/admin"));
  const showBanner = isReady && !consent && !isAdminRoute && !showPreferences;

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      isReady,
      showBanner,
      showPreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [
      consent,
      isReady,
      showBanner,
      showPreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences,
      closePreferences,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}
