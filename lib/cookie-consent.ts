/**
 * Cookie Consent Model & Utilities for CarVibe Dubai
 *
 * Persists visitor choices across sessions in localStorage with versioning
 * and timestamp metadata, ensuring optional analytics and marketing trackers
 * remain strictly inactive until explicit consent is given.
 */

export const CONSENT_STORAGE_KEY = "cvd_cookie_consent";
export const CURRENT_CONSENT_VERSION = "1.0";
export const COOKIE_CONSENT_EVENT = "cvd-cookie-consent-updated";
export const OPEN_PREFERENCES_EVENT = "cvd-open-cookie-preferences";

export type CookieConsentCategories = {
  /** Essential cookies required for security, sessions, and core navigation. Always enabled. */
  necessary: true;
  /** Site analytics, page view counts, and user interaction measurements. */
  analytics: boolean;
  /** Advertising, Meta Pixel, and campaign reach tracking. */
  marketing: boolean;
};

export type CookieConsentRecord = {
  version: string;
  timestamp: string;
  categories: CookieConsentCategories;
};

export type ConsentPreferencesInput = {
  analytics: boolean;
  marketing: boolean;
};

/**
 * Safely reads the consent record from localStorage.
 * Returns null if unset, corrupted, or if the stored version is outdated.
 */
export function getStoredConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== CURRENT_CONSENT_VERSION ||
      typeof parsed.timestamp !== "string" ||
      !parsed.categories ||
      parsed.categories.necessary !== true ||
      typeof parsed.categories.analytics !== "boolean" ||
      typeof parsed.categories.marketing !== "boolean"
    ) {
      return null;
    }

    return {
      version: parsed.version,
      timestamp: parsed.timestamp,
      categories: {
        necessary: true,
        analytics: parsed.categories.analytics,
        marketing: parsed.categories.marketing,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Persists user consent record to localStorage and dispatches a change event.
 */
export function saveConsent(preferences: ConsentPreferencesInput): CookieConsentRecord {
  const record: CookieConsentRecord = {
    version: CURRENT_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
    },
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch (err) {
      console.warn("[cookie-consent] Failed to save to localStorage:", err);
    }

    // Notify all active components and tracking wrappers
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: record }));
  }

  return record;
}

/**
 * Helper to check if a specific cookie category is currently allowed.
 */
export function isCategoryAllowed(category: keyof CookieConsentCategories): boolean {
  if (category === "necessary") return true;
  const stored = getStoredConsent();
  return Boolean(stored?.categories[category]);
}

/**
 * Dispatches an event to open the cookie preferences modal from anywhere (e.g. footer).
 */
export function openCookiePreferencesModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
  }
}
