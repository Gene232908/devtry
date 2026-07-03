"use client";

import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { brand, whatsappLink } from "@/config/brand";
import { copy } from "@/config/copy";
import { buttonClasses } from "@/components/ui/Button";
import { openValuationModal } from "./open-valuation-modal";

export function Hero() {
  return (
    <section id="home" className="relative isolate overflow-hidden bg-bg">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: "url('/images/carvibe-showroom-hero.jpg')",
          backgroundPosition: "62% center",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.96)_0%,rgba(10,10,10,.86)_33%,rgba(10,10,10,.35)_66%,rgba(10,10,10,.18)_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />

      <div className="container relative z-10 flex min-h-[calc(100svh-8.25rem)] flex-col justify-center py-10 sm:min-h-[calc(100svh-8.75rem)] sm:py-12 lg:py-14">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-caps text-gold">
            <span aria-hidden="true" className="gold-rule" />
            {brand.tagline}
          </p>
          <h1 className="mt-5 max-w-xl font-display text-fluid-5 font-extrabold leading-[1.03] tracking-tight text-text text-balance">
            {copy.hero.headline}
          </h1>
          <p className="mt-5 max-w-xl text-fluid-0 leading-8 text-text-muted">{copy.hero.sub}</p>

          <div className="mt-7 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={openValuationModal}
              className="flex min-h-14 items-center justify-between rounded-card border border-gold bg-gold/15 px-4 text-left transition-colors hover:bg-gold/20"
            >
              <span className="font-semibold text-text">{copy.hero.modes[0].label}</span>
              <span className="text-fluid--1 font-bold uppercase text-gold">{copy.hero.modes[0].state}</span>
            </button>
            <span
              aria-disabled="true"
              className="flex min-h-14 items-center justify-between rounded-card border border-white/10 bg-bg/40 px-4 text-left opacity-75"
            >
              <span className="font-semibold text-text-muted">{copy.hero.modes[1].label}</span>
              <span className="text-fluid--1 font-bold uppercase text-text-faint">{copy.hero.modes[1].state}</span>
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={openValuationModal} className={buttonClasses({ size: "lg" })}>
              {copy.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={whatsappLink("Hi, I'd like to get my free car valuation.")}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "border-white/20 bg-bg/40 backdrop-blur-md hover:border-gold",
              })}
            >
              <MessageCircle className="h-4 w-4 text-gold" />
              {copy.hero.secondaryCta}
            </a>
          </div>

          <div className="mt-8 flex max-w-xl flex-wrap gap-x-6 gap-y-2.5">
            {copy.hero.assurances.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 text-fluid--1 text-text-muted">
                <Check className="h-3.5 w-3.5 text-gold" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-6">
          {copy.hero.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-fluid-2 leading-none text-gold">{stat.value}</p>
              <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-caps text-text-faint">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
