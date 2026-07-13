"use client";

import { ArrowRight, Clock, MapPin } from "lucide-react";
import { brand } from "@/config/brand";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";
import { openValuationModal } from "./open-valuation-modal";

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

export function FlexibleInspection() {
  return (
    <Section id="inspection">
      <Reveal>
        <SectionHeader
          eyebrow="Our Dubai Branch"
          title="Bring your car to our branch for a free inspection."
          intro="Drive in to the CarVibeDubai branch and our specialists inspect your car on the spot - then make a fair cash offer the same day."
        />
      </Reveal>

      <Reveal delay={120}>
        <div className="relative mt-12 overflow-hidden rounded-card border border-border-gold/45 bg-gradient-to-br from-gold/[0.07] to-white/[0.01] p-8 sm:p-10 lg:mt-16 lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(212,175,78,.16),transparent_70%)]"
          />
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-6">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card border border-gold/40 bg-gold/10 text-gold">
                <MapPin className="h-8 w-8" aria-hidden="true" strokeWidth={1.6} />
              </span>
              <div>
                <p className="font-display text-fluid-1 font-medium uppercase tracking-wide text-text">{brand.branch}</p>
                <p className="mt-1 text-fluid--1 font-light text-text-muted">{brand.branchAddress}</p>
                <p className="mt-4 flex items-center gap-2 text-fluid--1 font-light text-text-muted">
                  <Clock className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  {brand.hours}
                </p>
                <p className="mt-5 max-w-md text-fluid--1 font-light leading-7 text-text-muted">
                  Book a time that works for you and drop by whenever you&apos;re ready.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openValuationModal}
              className={buttonClasses({ size: "lg", className: "h-14 w-full shrink-0 text-[0.9rem] font-bold uppercase tracking-[0.1em] animate-cta-pulse sm:h-16 lg:w-auto" })}
            >
              Book Your Free Inspection
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={180}>
        <div className="mt-8 flex flex-col items-center gap-4 rounded-card border border-white/10 bg-white/[0.02] px-6 py-5 sm:flex-row sm:justify-between">
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.2em] text-text-faint">
            Coverage across all 7 Emirates
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {EMIRATES.map((emirate) => (
              <span key={emirate} className="text-fluid--1 font-light text-text-muted">
                {emirate}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
