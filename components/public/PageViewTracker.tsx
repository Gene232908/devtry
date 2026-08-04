"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { randomId } from "@/lib/random-id";

const SESSION_KEY = "cvd_session_id";

function getSessionId(): string {
  // sessionStorage throws outright in some privacy modes, so a blocked store
  // falls back to a per-view id rather than taking the page with it.
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

// Fires a best-effort page_view event on every route change so the admin
// dashboard's "visitors this week" stat reflects real traffic. Everything here
// is wrapped: analytics must never disrupt the page, and that has to hold for
// building the payload as much as for sending it.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "page_view", path: pathname, sessionId: getSessionId() }),
        keepalive: true,
      }).catch(() => {
        // best-effort; ignore failures
      });
    } catch {
      // best-effort; ignore failures
    }
  }, [pathname]);

  return null;
}
