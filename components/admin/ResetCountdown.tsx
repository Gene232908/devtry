"use client";

import { useEffect, useState } from "react";
import { formatTimeUntil, nextUaeMidnightUtc } from "@/lib/uae-time";

/**
 * "Resets in 04h 32m" — how long the visitor figure above has left before it
 * returns to zero.
 *
 * Its own component so that the tick re-renders one line of text rather than
 * the whole card, and so the stat cards stay server-renderable.
 *
 * Nothing is rendered until it has mounted in the browser. The countdown is
 * derived from the current clock, and a server render would produce a value a
 * second or two out of date — React would flag the mismatch on hydration, and
 * the fix for that is not to guess on the server at all.
 */
export function ResetCountdown() {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      setRemaining(formatTimeUntil(nextUaeMidnightUtc()));
    }

    tick();
    // Every 20 seconds. The display is hours and minutes, so a per-second timer
    // would re-render sixty times to change the text once — and this sits on a
    // dashboard people leave open all day.
    const timer = setInterval(tick, 20_000);
    return () => clearInterval(timer);
  }, []);

  // Reserves its own line from the first paint, so the card does not grow by a
  // row the moment the countdown appears.
  if (!remaining) return <span className="text-fluid--1 text-transparent">&nbsp;</span>;

  return (
    <span className="text-fluid--1 text-text-faint">
      Resets in <span className="tabular-nums text-text-muted">{remaining}</span>
    </span>
  );
}
