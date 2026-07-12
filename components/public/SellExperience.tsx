"use client";

import { ArrowRight, FileCheck } from "lucide-react";
import { landingImages, sellingSteps } from "@/config/homepage";
import { buttonClasses } from "@/components/ui/Button";
import { openValuationModal } from "./open-valuation-modal";
import { Reveal } from "./Reveal";

const TRUST_POINTS = ["Fast vehicle valuation", "Transparent follow-up", "Hassle-free documents"];

export function SellExperience() {
  return (
    <section
      id="sell-your-car"
      className="relative isolate scroll-mt-28 overflow-hidden bg-bg py-section sm:scroll-mt-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${landingImages.process}')`, backgroundPosition: "center 42%" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,1)_0%,rgba(10,10,10,1)_9%,rgba(10,10,10,.72)_44%,rgba(10,10,10,.82)_74%,rgba(10,10,10,1)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[60vh] w-[70%] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(212,175,78,.1),transparent_72%)] blur-[60px]"
      />

      <div className="container relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-3 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-gold">
            <span aria-hidden="true" className="gold-rule" />
            How It Works
            <span aria-hidden="true" className="gold-rule" />
          </p>
          <h2 className="mt-5 font-display text-fluid-4 font-light leading-[1.08] text-text text-balance">
            Three clear steps from request to decision.
          </h2>
          <p className="mt-4 text-fluid-0 font-light leading-8 text-text-muted">
            A private sale path built around valuation, inspection, and secure handover - simple to follow from your
            first message to a fair, final offer.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {sellingSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 120} className="h-full">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/[0.055] p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/45 hover:bg-white/[0.08] hover:shadow-[0_30px_70px_-42px_rgba(212,175,78,.6)] sm:p-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(244,227,168,.5),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display text-fluid-1 font-light text-gold transition-colors duration-300 group-hover:border-gold/60 group-hover:bg-gold/15">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-text-faint">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-fluid-1 font-light leading-snug text-text">{step.title}</h3>
                <p className="mt-3 text-fluid--1 font-light leading-7 text-text-muted">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center gap-6 rounded-2xl border border-white/12 bg-white/[0.045] px-6 py-7 backdrop-blur-xl sm:flex-row sm:justify-between sm:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {TRUST_POINTS.map((point) => (
                <span key={point} className="flex items-center gap-2 text-fluid--1 font-light text-text-muted">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
                  {point}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={openValuationModal}
              className={buttonClasses({ size: "lg", className: "w-full shrink-0 sm:w-auto" })}
            >
              Start free valuation
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <Reveal delay={180} className="mt-5 flex justify-center">
          <p className="flex items-center gap-2 text-center text-[0.72rem] font-light text-text-faint">
            <FileCheck className="h-4 w-4 shrink-0" />
            Your details are stored securely and reviewed only by the CarVibeDubai team.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
