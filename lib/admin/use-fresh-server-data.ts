"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered admin screen showing current data.
 *
 * Every admin screen that fetches on the server (Overview, Inventory,
 * Commission, Incomplete Forms, Blocked Numbers) has the same weakness: its
 * figures are produced during a server render, and the App Router then caches
 * that rendered payload per navigation. Arriving at the page can therefore show
 * a copy produced minutes earlier, with nothing on screen admitting it.
 *
 * That is not theoretical. Incomplete Forms showed "no incomplete forms" while
 * two captured forms sat in the database, because the page had last been
 * rendered when the table was empty and the cached copy was served ever after.
 * Before these screens moved to the server they fetched on mount, so they were
 * always fresh — by accident. This is the deliberate version of that guarantee.
 *
 * Refreshing on mount covers arriving at the page; on focus covers coming back
 * to it; on a timer covers sitting and watching it. See POLL_MS.
 */
/**
 * How often an open, VISIBLE admin screen re-reads itself.
 *
 * Twenty seconds is short enough that a lead arriving while someone watches the
 * list appears on its own, and long enough to stay cheap. Measured against this
 * project's database: one read is ~126ms and costs roughly 180 reads an hour
 * per open tab — about 1,400 over a working day, which is nothing.
 *
 * The earlier version refused to poll at all on the grounds that a forgotten
 * tab would bill someone forever. That concern was right in shape and wrong in
 * size, and it cost more than it saved: it left the screens unable to show new
 * data without a manual refresh, which is the one thing they exist to do. The
 * visibility guard below is what actually addresses it — a hidden tab polls
 * nothing at all.
 */
const POLL_MS = 20_000;

export function useFreshServerData() {
  const router = useRouter();

  useEffect(() => {
    // Deliberately does NOT refresh on mount.
    //
    // It used to, and that single line was the reason the dashboard felt slow:
    // arriving at a page rendered it on the server for the navigation and then
    // immediately rendered it again for the refresh. Every sidebar click paid
    // twice — on Commission, twice for ~560ms.
    //
    // The staleness it was there to fix is now prevented instead of corrected:
    // `experimental.staleTimes.dynamic = 0` in next.config.mjs stops the client
    // Router Cache serving a previously visited admin route from memory, so the
    // navigation itself always reaches the server and what it brings back is
    // already current. Refreshing on top of that re-fetched data nobody had had
    // time to read.
    //
    // The listeners below still do the rest of the job: coming BACK to the tab,
    // and sitting watching an open page.

    function refreshIfVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);

    // Only fires while the tab is actually on screen. A dashboard left open in
    // a background tab overnight makes no requests at all.
    const timer = setInterval(refreshIfVisible, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      clearInterval(timer);
    };
  }, [router]);
}

/**
 * Local state that starts from a server-rendered value AND adopts later ones.
 *
 * `useState(serverValue)` runs its initialiser on the FIRST render only. Every
 * one of these screens used it, which meant that once mounted they kept their
 * original data for as long as the component lived: a fresh server render —
 * from `router.refresh()`, from a navigation, from anything — arrived as a new
 * prop and was silently discarded.
 *
 * The effect was that the pages looked broken in whichever direction the stale
 * copy happened to be wrong. Inventory showed a car that had been deleted, and
 * "Mark sold" on it answered "Inventory item not found" because the row really
 * was gone. Incomplete Forms showed an empty table while captures sat in the
 * database. Refreshing the server data could not fix either, because the
 * refreshed data was thrown away on arrival.
 *
 * Writes still go through the returned setter, so optimistic updates and the
 * post-action reloads behave exactly as before — this only adds "and take the
 * server's word for it when the server speaks again".
 */
export function useServerState<T>(serverValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(serverValue);

  useEffect(() => {
    setValue(serverValue);
  }, [serverValue]);

  return [value, setValue];
}

/**
 * The same freshness guarantee as `useFreshServerData`, for screens that fetch
 * their own data in the browser rather than rendering it on the server.
 *
 * Leads and the Vehicle Catalog are the two admin screens built that way. They
 * were left behind when the others were fixed, because the fix that worked
 * there cannot work here: `useFreshServerData` calls `router.refresh()`, which
 * re-runs a SERVER render. These components fetch from `/api/...` inside a
 * `useEffect`, so a server re-render produces the same shell and re-runs no
 * fetch at all — applying that hook to them would have looked like a fix and
 * changed nothing.
 *
 * What they were left with instead:
 *   Leads    re-fetched on focus, but never while you sat watching it, so a
 *            lead arriving on an open list stayed invisible indefinitely.
 *   Catalog  fetched once on mount and never again — not on focus, not ever.
 *            A make added in another tab was absent until a manual reload.
 *
 * Passing the fetch itself keeps the two paths identical in behaviour: mount,
 * focus, visibility, and the same POLL_MS timer, with the same rule that a
 * hidden tab polls nothing.
 *
 * The caller's `load` must be referentially stable (a `useCallback` with real
 * dependencies), or the effect would tear down and re-subscribe on every render
 * — the classic way this pattern turns into an infinite fetch loop.
 */
export function useRefreshOnFocus(load: () => void | Promise<void>, enabled = true) {
  // Held in a ref so the effect below depends on NOTHING that changes per
  // render: it subscribes once and stays subscribed, while still always calling
  // the latest `load`. Depending on `load` directly would re-run the effect
  // whenever a caller forgot to memoise it, re-fetching on every render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    // Nothing is subscribed while disabled, so a provider that lives in the
    // admin LAYOUT can stop polling on the pages that do not display its data
    // rather than fetching it behind every screen in the dashboard.
    if (!enabled) return;

    let cancelled = false;

    function refreshIfVisible() {
      // `cancelled` stops a timer or listener that fired during teardown from
      // calling into an unmounted component.
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      void loadRef.current();
    }

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    const timer = setInterval(refreshIfVisible, POLL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      clearInterval(timer);
    };
    // The initial fetch is deliberately NOT triggered here — these screens
    // already load on mount, and doing it again would double every page's first
    // request.
  }, [enabled]);
}
