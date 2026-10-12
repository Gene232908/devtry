import { isCategoryAllowed } from "./cookie-consent";

/**
 * Records that a visitor pressed one of the two contact buttons.
 *
 * Fire-and-forget on purpose. Opening the valuation form is what the visitor
 * asked for; it must not wait on analytics, and it must still happen if this
 * fails.
 */
export type ContactClick = "whatsapp_click" | "call_click";

type MetaEvent = "Lead" | "Contact";

/** Send a standard Meta browser event only when marketing consent is granted. */
export function trackMetaEvent(event: MetaEvent, contentName: string) {
  if (!isCategoryAllowed("marketing")) return;
  try {
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq !== "function") return;
    fbq("track", event, { content_name: contentName });
  } catch {
    // Analytics must never break the public website.
  }
}

/** Record internal contact button interaction only when analytics consent is granted. */
export function trackContactClick(type: ContactClick) {
  if (!isCategoryAllowed("analytics")) return;
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      // The click usually navigates or opens a dialog immediately after, which
      // would cancel an in-flight request without this.
      keepalive: true,
    }).catch(() => {
      // best-effort; ignore failures
    });
  } catch {
    // best-effort; ignore failures
  }
}
