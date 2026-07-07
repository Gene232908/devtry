"use client";

import { sellerAssurances } from "@/config/homepage";
import { buttonClasses } from "@/components/ui/Button";
import { openValuationModal } from "./open-valuation-modal";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

export function SellerAssurance() {
  return (
    <Section id="why-sell-to-us">
      <Reveal>
        <SectionHeader
          eyebrow="Why Sell To CarVibeDubai"
          title="A fair, transparent process built to earn your trust."
          intro="Handing over your car is a big decision. Every step is designed to keep the deal honest, balanced, and pressure-free."
        />
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-3 lg:mt-16">
        {sellerAssurances.map((item, index) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.title} delay={index * 110} className="h-full">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-gold/40 hover:bg-white/[0.055] hover:shadow-[0_36px_80px_-46px_rgba(212,175,78,.6)] sm:p-9">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(244,227,168,.7),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(212,175,78,.16),transparent_70%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                />
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <span className="absolute top-0 h-full w-1/3 -translate-x-[260%] -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)] transition-transform duration-[1100ms] ease-out group-hover:translate-x-[460%]" />
                </span>

                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.08] text-gold transition-all duration-500 group-hover:scale-105 group-hover:border-gold/55 group-hover:bg-gold/[0.14]">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full ring-1 ring-gold/0 transition-all duration-500 group-hover:ring-4 group-hover:ring-gold/10"
                  />
                  <Icon className="relative h-[1.35rem] w-[1.35rem]" aria-hidden="true" strokeWidth={1.5} />
                </span>

                <h3 className="mt-8 font-display text-fluid-1 font-light leading-snug text-text transition-colors duration-300 group-hover:text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-fluid--1 font-light leading-7 text-text-muted">{item.body}</p>

                <span
                  aria-hidden="true"
                  className="mt-8 block h-px w-10 bg-gold/35 transition-all duration-500 group-hover:w-20 group-hover:bg-gold"
                />
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={120} className="mt-12 flex justify-center">
        <button type="button" onClick={openValuationModal} className={buttonClasses({ size: "lg" })}>
          Get Your Free Valuation
        </button>
      </Reveal>
    </Section>
  );
}
