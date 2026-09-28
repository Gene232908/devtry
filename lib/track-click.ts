/**
 * Records that a visitor pressed one of the two contact buttons.
 *
 * These were never recorded. `whatsapp_click` was an accepted event type and
 * the Overview counted it, but nothing in the site ever sent one — so the
 * figure was permanently zero and read as "nobody wants to contact us" rather
 * than "this is not wired up", which is the worse of the two failures.
 *
 * Fire-and-forget on purpose. Opening the valuation form is what the visitor
 * asked for; it must not wait on analytics, and it must still happen if this
 * fails. Everything here is wrapped for the same reason the page-view tracker
 * is: building the payload can throw as easily as sending it.
 */
export type ContactClick = "whatsapp_click" | "call_click";

type MetaEvent = "Lead" | "Contact";

/** Send a standard Meta browser event without ever blocking the user flow. */
export function trackMetaEvent(event: MetaEvent, contentName: string) {
  try {
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq !== "function") return;
    fbq("track", event, { content_name: contentName });
  } catch {
    // Analytics must never break the public website.
  }
}

export function trackContactClick(type: ContactClick) {
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
