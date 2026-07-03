"use client";

import { ArrowRight, FileCheck } from "lucide-react";
import { sellingSteps } from "@/config/homepage";
import { buttonClasses } from "@/components/ui/Button";
import { openValuationModal } from "./open-valuation-modal";
import { Section } from "./Section";

export function SellExperience() {
  return (
    <Section id="sell-your-car">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch lg:gap-14">
        <div className="relative overflow-hidden rounded-card">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: "url('/images/carvibe-valuation-desk.jpg')",
              backgroundPosition: "52% center",
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />

          <div className="relative flex h-full min-h-[420px] flex-col justify-end p-6 sm:min-h-[500px] sm:p-8">
            <p className="flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-caps text-gold">
              <span aria-hidden="true" className="gold-rule" />
              Sell Your Car
            </p>
            <h2 className="mt-4 max-w-xl font-display text-fluid-4 font-bold leading-[1.05] tracking-tight text-text">
              A private sale path built around valuation, inspection, and secure handover.
            </h2>
            <p className="mt-4 text-fluid--1 text-text-muted">
              Fast vehicle valuation · Transparent follow-up · Hassle-free documents
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-caps text-gold">Professional Process</p>
            <h3 className="mt-4 font-display text-fluid-3 font-bold leading-tight tracking-tight text-text">
              Three clear steps from request to decision.
            </h3>
          </div>

          <div className="mt-6 divide-y divide-white/5">
            {sellingSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[auto_1fr] gap-5 py-6">
                <span className="w-12 font-display text-fluid-3 font-bold leading-none text-gold/80">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h4 className="font-display text-fluid-1 font-semibold text-text">{step.title}</h4>
                  <p className="mt-2 text-fluid--1 leading-7 text-text-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hairline-t mt-auto pt-6">
            <button
              type="button"
              onClick={openValuationModal}
              className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
            >
              Start free valuation
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="mt-4 flex items-center gap-2 text-fluid--1 text-text-muted">
              <FileCheck className="h-4 w-4 shrink-0 text-text-faint" />
              Documentation and backend storage remain pending final approval.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
