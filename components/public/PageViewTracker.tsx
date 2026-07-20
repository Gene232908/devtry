"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "cvd_session_id";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Fires a best-effort page_view event on every route change so the admin
// dashboard's "visitors this week" stat reflects real traffic. Silent no-op
// if the request fails — analytics must never disrupt the page.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_view", path: pathname, sessionId: getSessionId() }),
      keepalive: true,
    }).catch(() => {
      // best-effort; ignore failures
    });
  }, [pathname]);

  return null;
}
