"use client";

import { useEffect, useState } from "react";
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
    router.refresh();

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
