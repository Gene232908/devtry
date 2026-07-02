"use client";

import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { brand, whatsappLink } from "@/config/brand";
import { copy } from "@/config/copy";
import { openValuationModal } from "./open-valuation-modal";

export function Hero() {
  return (
    <section id="home" className="relative isolate overflow-hidden border-b border-border-gold/70 bg-bg">
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
          <p className="text-fluid--1 font-bold uppercase text-gold">{brand.tagline}</p>
          <h1 className="mt-5 max-w-xl font-display text-fluid-5 font-extrabold leading-[1.03] text-text text-balance">
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
              className="flex min-h-14 items-center justify-between rounded-card border border-border-gold/45 bg-bg/40 px-4 text-left opacity-75"
            >
              <span className="font-semibold text-text-muted">{copy.hero.modes[1].label}</span>
              <span className="text-fluid--1 font-bold uppercase text-text-faint">{copy.hero.modes[1].state}</span>
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openValuationModal}
              className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-btn px-6 text-fluid-0 font-semibold shadow-[0_16px_42px_-22px_rgba(243,222,138,.9)] transition-all duration-200 hover:brightness-110"
            >
              {copy.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={whatsappLink("Hi, I'd like to get my free car valuation.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-btn border border-border-gold/80 bg-bg/40 px-6 text-fluid-0 font-semibold text-text backdrop-blur-md transition-colors hover:border-gold hover:bg-surface-2/80"
            >
              <MessageCircle className="h-4 w-4 text-gold" />
              {copy.hero.secondaryCta}
            </a>
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {copy.hero.assurances.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-border-gold/60 bg-bg/45 px-3 py-2 text-fluid--1 text-text-muted backdrop-blur-md"
              >
                <Check className="h-3.5 w-3.5 text-gold" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid max-w-3xl grid-cols-3 overflow-hidden rounded-card border border-border-gold/60 bg-bg/45 backdrop-blur-md sm:mt-10">
          {copy.hero.stats.map((stat) => (
            <div key={stat.label} className="border-r border-border-gold/50 p-3 last:border-r-0 sm:p-4">
              <p className="font-display text-fluid-1 leading-none text-gold sm:text-fluid-2">{stat.value}</p>
              <p className="mt-2 text-[0.58rem] font-semibold uppercase text-text-faint sm:text-fluid--1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
