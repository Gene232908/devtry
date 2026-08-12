"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small info button that reveals a short explanation.
 *
 * Opens on hover, on keyboard focus, AND on tap. All three are needed: hover
 * alone leaves the text unreachable on a phone, and a tooltip that only a mouse
 * can open is a tooltip half the users never see. Tapping toggles, so a touch
 * user can also dismiss it without hunting for somewhere neutral to press.
 *
 * The trigger is a real <button> with `aria-describedby` pointing at the bubble,
 * so a screen reader announces the description as part of the control rather
 * than as loose text floating in the card.
 */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;

    // A tap opened it; a tap anywhere else should close it. Escape too, so a
    // keyboard user is never trapped with a bubble covering the card below.
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="What this means"
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-text-faint transition-colors",
          "hover:text-gold focus-visible:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
          open && "text-gold",
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span
          id={tipId}
          role="tooltip"
          /**
           * Anchored to the right edge and opening downward. These cards sit in
           * a grid where the icon is always top-right, so a bubble growing left
           * and down stays inside the card's column instead of being clipped by
           * the viewport on the last one.
           */
          className={cn(
            "absolute right-0 top-7 z-40 w-56 rounded-card border border-border-gold/70 bg-surface-2 px-3 py-2",
            "text-left text-fluid--1 font-normal leading-5 text-text-muted",
            "shadow-[0_18px_42px_-18px_rgba(0,0,0,.9)] animate-fade-in",
            // Pointer events off: the bubble must never sit between the cursor
            // and the button it belongs to, which would make hover flicker.
            "pointer-events-none",
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
