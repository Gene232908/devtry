"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { randomId } from "@/lib/random-id";
import { startOfUaeDayUtc } from "@/lib/uae-time";

const VISITOR_KEY = "cvd_visitor_id";

/**
 * Fallback identity for browsers that refuse persistent storage.
 *
 * Module-level, so it survives every re-render and route change for as long as
 * the page is open. It used to return a fresh `randomId()` on each call, which
 * meant a privacy-mode visitor was counted as a brand new person on every
 * single page they opened — the exact over-counting this tracker exists to
 * avoid, concentrated on the users least likely to be duplicates.
 */
let memoryVisitorId: string | null = null;

/**
 * A stable id for one PERSON, held in localStorage.
 *
 * This used sessionStorage, which is scoped to a single browser tab and thrown
 * away when that tab closes. The effect on the numbers was severe and always in
 * the same direction:
 *
 *   - opening the site in a second tab created a second "visitor"
 *   - closing the tab and coming back later created another one
 *   - so one person visiting on Monday, Wednesday and Friday was three
 *     visitors, and "visitors this week" measured browsing sessions rather
 *     than people
 *
 * It was visible in the live data: fourteen page views had produced twelve
 * distinct ids, several of them arriving in the same second.
 *
 * localStorage persists across tabs and across visits, so the same person stays
 * one visitor. Counting distinct ids over a window then answers the question
 * the dashboard actually asks — how many people came this week — rather than
 * how many times a tab was opened.
 */
function getVisitorId(): string {
  // localStorage throws outright in some privacy modes, so a blocked store
  // falls back to the in-memory id rather than taking the page with it.
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    if (!memoryVisitorId) memoryVisitorId = randomId();
    return memoryVisitorId;
  }
}

const SEEN_KEY = "cvd_pv_seen";

type SeenToday = { day: string; paths: string[] };

/** The UAE calendar day, as a plain key. Matches how the dashboard buckets. */
function uaeDayKey(): string {
  return startOfUaeDayUtc().toISOString().slice(0, 10);
}

/** Per-tab fallback for browsers that refuse storage. */
let memorySeen: SeenToday | null = null;

function readSeen(): SeenToday {
  const today = uaeDayKey();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as SeenToday) : null;
    // A new UAE day starts the list over, so the same visitor is recorded again
    // tomorrow — which is the point: the dashboard counts people PER DAY.
    if (parsed && parsed.day === today && Array.isArray(parsed.paths)) return parsed;
    return { day: today, paths: [] };
  } catch {
    if (!memorySeen || memorySeen.day !== today) memorySeen = { day: today, paths: [] };
    return memorySeen;
  }
}

function writeSeen(seen: SeenToday) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    memorySeen = seen;
  }
}

/**
 * Records that this person opened this page today — once.
 *
 * A page_view row used to be written on every route change and every reload, so
 * one person refreshing the landing page twenty times wrote twenty rows. The
 * visitor COUNT was never wrong (it collapses rows by visitor id), but the table
 * grew at the rate people click rather than the rate people arrive, and every
 * dashboard read had to scan all of it.
 *
 * Now a row is written at most once per visitor, per path, per UAE day:
 *
 *   - open the site, refresh it ten times      -> 1 row
 *   - then read Privacy and Terms              -> 2 more rows
 *   - come back tomorrow                       -> rows again, on the new day
 *
 * Per-path rather than one row per visitor, because `path` is the only thing
 * that could ever answer "which pages do people actually read" — collapsing to a
 * single row per day would save a little more and throw that away permanently.
 *
 * The visitor figures are unchanged by this: they were already counting distinct
 * people, so removing duplicate rows removes only duplicates.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  // React StrictMode runs effects twice in development, and a parent re-render
  // can re-run this one. The storage check below already covers repeats, but
  // this avoids even building the request twice within a single mount.
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSentRef.current === pathname) return;
    lastSentRef.current = pathname;

    const seen = readSeen();
    if (seen.paths.includes(pathname)) return;
    writeSeen({ day: seen.day, paths: [...seen.paths, pathname] });

    try {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Still sent as `sessionId` because that is the API field and the
        // `events.session_id` column; what changed is that the value now
        // identifies a person rather than a tab.
        body: JSON.stringify({ type: "page_view", path: pathname, sessionId: getVisitorId() }),
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
