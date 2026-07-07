"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { copy } from "@/config/copy";
import { landingImages } from "@/config/homepage";
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
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-3 backdrop-blur-md animate-fade-in sm:p-5"
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
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border-gold/60 bg-bg/70 text-text-muted backdrop-blur-md transition-colors hover:border-gold hover:text-text"
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

          <div className="relative hidden min-h-[520px] border-l border-border-gold/55 p-7 lg:block">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover opacity-30"
              style={{
                backgroundImage: `url('${landingImages.modal}')`,
                backgroundPosition: "50% 58%",
              }}
            />
            <div className="relative flex h-full items-center">
              <div
                role="img"
                aria-label="Luxury car in a Dubai showroom"
                className="aspect-[1.08/1] w-full overflow-hidden rounded-card border border-border-gold/75 bg-cover bg-[64%_center] shadow-[0_24px_60px_-38px_rgba(243,222,138,.75)] backdrop-blur-sm"
                style={{ backgroundImage: `url('${landingImages.modal}')` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
