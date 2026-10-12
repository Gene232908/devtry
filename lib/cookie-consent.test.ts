import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  COOKIE_CONSENT_EVENT,
  OPEN_PREFERENCES_EVENT,
  getStoredConsent,
  saveConsent,
  isCategoryAllowed,
  openCookiePreferencesModal,
} from "./cookie-consent";

describe("cookie consent storage and validation", () => {
  let mockStore: Record<string, string> = {};
  const eventListeners: Record<string, ((e: unknown) => void)[]> = {};

  beforeEach(() => {
    mockStore = {};

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        mockStore[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
    };

    const mockWindow = {
      localStorage: mockLocalStorage,
      addEventListener: vi.fn((event: string, cb: (e: unknown) => void) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: (e: unknown) => void) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter((fn) => fn !== cb);
        }
      }),
      dispatchEvent: vi.fn((event: { type: string }) => {
        const listeners = eventListeners[event.type] ?? [];
        for (const fn of listeners) {
          fn(event);
        }
        return true;
      }),
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("CustomEvent", class CustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, params?: { detail?: unknown }) {
        this.type = type;
        this.detail = params?.detail;
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no consent has been recorded", () => {
    expect(getStoredConsent()).toBeNull();
    expect(isCategoryAllowed("necessary")).toBe(true);
    expect(isCategoryAllowed("analytics")).toBe(false);
    expect(isCategoryAllowed("marketing")).toBe(false);
  });

  it("returns null and invalidates if stored version is outdated", () => {
    const outdated = {
      version: "0.9",
      timestamp: "2026-01-01T00:00:00.000Z",
      categories: { necessary: true, analytics: true, marketing: true },
    };
    mockStore[CONSENT_STORAGE_KEY] = JSON.stringify(outdated);

    expect(getStoredConsent()).toBeNull();
    expect(isCategoryAllowed("marketing")).toBe(false);
  });

  it("returns null for malformed or corrupted JSON", () => {
    mockStore[CONSENT_STORAGE_KEY] = "invalid-json{";
    expect(getStoredConsent()).toBeNull();
  });

  it("saves and reads valid consent for Accept All", () => {
    const record = saveConsent({ analytics: true, marketing: true });

    expect(record.version).toBe(CURRENT_CONSENT_VERSION);
    expect(record.categories).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    expect(typeof record.timestamp).toBe("string");

    const retrieved = getStoredConsent();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.categories.necessary).toBe(true);
    expect(retrieved?.categories.analytics).toBe(true);
    expect(retrieved?.categories.marketing).toBe(true);

    expect(isCategoryAllowed("necessary")).toBe(true);
    expect(isCategoryAllowed("analytics")).toBe(true);
    expect(isCategoryAllowed("marketing")).toBe(true);
  });

  it("saves and reads valid consent for Reject Optional", () => {
    const record = saveConsent({ analytics: false, marketing: false });

    expect(record.categories).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    });

    const retrieved = getStoredConsent();
    expect(retrieved?.categories.analytics).toBe(false);
    expect(retrieved?.categories.marketing).toBe(false);

    expect(isCategoryAllowed("necessary")).toBe(true);
    expect(isCategoryAllowed("analytics")).toBe(false);
    expect(isCategoryAllowed("marketing")).toBe(false);
  });

  it("saves custom preferences accurately", () => {
    saveConsent({ analytics: true, marketing: false });

    expect(isCategoryAllowed("necessary")).toBe(true);
    expect(isCategoryAllowed("analytics")).toBe(true);
    expect(isCategoryAllowed("marketing")).toBe(false);
  });

  it("dispatches COOKIE_CONSENT_EVENT when consent is saved", () => {
    const listener = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, listener);

    saveConsent({ analytics: true, marketing: false });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as { detail: { categories: { analytics: boolean; marketing: boolean } } };
    expect(event.detail.categories.analytics).toBe(true);
    expect(event.detail.categories.marketing).toBe(false);

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener);
  });

  it("dispatches OPEN_PREFERENCES_EVENT when openCookiePreferencesModal is called", () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_PREFERENCES_EVENT, listener);

    openCookiePreferencesModal();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_PREFERENCES_EVENT, listener);
  });
});
