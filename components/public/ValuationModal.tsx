"use client";

import { useEffect, useState } from "react";
import { Banknote, MapPin, ShieldCheck, X } from "lucide-react";
import { copy } from "@/config/copy";
import { ValuationForm } from "./valuation-form";
import { VALUATION_MODAL_EVENT } from "./open-valuation-modal";

export function ValuationModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }

    window.addEventListener(VALUATION_MODAL_EVENT, onOpen);
    return () => window.removeEventListener(VALUATION_MODAL_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.documentElement.classList.remove("modal-open");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Private car valuation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="relative max-h-[92svh] w-full max-w-6xl overflow-hidden rounded-card border border-border-gold/75 bg-[#10100f] shadow-[0_0_0_1px_rgba(243,222,138,.12),0_28px_90px_-38px_rgba(243,222,138,.7)]">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(243,222,138,.9),transparent)]" />
        <div className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,.75),transparent)]" />

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close valuation modal"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border-gold/60 bg-bg/90 text-text-muted transition-colors hover:border-gold hover:text-text"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid max-h-[92svh] overflow-y-auto lg:grid-cols-[1.08fr_.92fr]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="mb-5 flex items-center justify-between gap-4 pr-12">
              <div>
                <p className="text-fluid--1 font-medium uppercase text-gold">{copy.valuation.eyebrow}</p>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-border-gold/60 bg-surface-2/70 px-3 py-2 text-fluid--1 font-light text-text-muted sm:inline-flex">
                <ShieldCheck className="h-4 w-4 text-gold" />
                No instant price shown
              </span>
            </div>

            <ValuationForm />
          </div>

          <div className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden border-l border-border-gold/55 bg-[radial-gradient(120%_85%_at_82%_0%,rgba(212,175,78,.18),transparent_58%)] p-8 lg:flex">
            {/* animated location rings */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
              <span className="absolute left-1/2 top-[44%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/25 animate-ping-ring will-change-transform" />
              <span className="absolute left-1/2 top-[44%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/15 animate-ping-ring will-change-transform [animation-delay:1.1s]" />
            </div>

            <p className="relative text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-gold">
              CarVibeDubai
            </p>

            <div className="relative flex flex-1 flex-col items-center justify-center text-center">
              <span className="relative mb-7 flex h-20 w-20 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-gold/20 animate-ping-ring will-change-transform motion-reduce:hidden" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold animate-ad-float will-change-transform motion-reduce:animate-none">
                  <MapPin className="h-9 w-9" aria-hidden="true" strokeWidth={1.5} />
                </span>
              </span>
              <h3 className="font-display text-fluid-2 font-light leading-tight text-text">
                We Buy Cars Across the UAE
              </h3>
              <p className="mt-3 max-w-xs text-fluid--1 font-light leading-7 text-text-muted">
                Wherever you are in the UAE, get a free car valuation and request a market-based offer from CarVibeDubai.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["Instant cash", "Free inspection", "All 7 Emirates"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[0.72rem] font-medium text-gold"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <p className="relative flex items-center gap-2 text-fluid--1 font-light text-text-muted">
              <Banknote className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              Fair cash offer, paid on handover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
