"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { landingImages, scrapPoints } from "@/config/homepage";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";
import { openValuationModal } from "./open-valuation-modal";

export function ScrapCars() {
  return (
    <Section id="scrap" tone="panel">
      <Reveal>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,32rem)_1fr] lg:items-start lg:gap-x-8">
          <SectionHeader
            eyebrow="Scrap Cars"
            title="Scrap, damaged or non-running? We still pay cash."
            intro="Not every car is showroom-ready - and that's fine. CarVibeDubai buys accident, non-running, and old cars too, with a fair cash offer."
          />

          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 shadow-[0_16px_34px_-16px_rgba(0,0,0,.7)] lg:-mt-8">
            <Image
              src={landingImages.scrap}
              alt="CarVibeDubai buys scrap cars - illustration of a seller trading in a damaged car for cash"
              fill
              className="object-cover object-top"
              sizes="(min-width: 1024px) 60vw, 90vw"
            />
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-5 sm:grid-cols-3 lg:mt-10">
        {scrapPoints.map((point, index) => {
          const Icon = point.icon;
          return (
            <Reveal key={point.title} delay={index * 110} className="h-full">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-gold/40 hover:bg-white/[0.055] hover:shadow-[0_36px_80px_-46px_rgba(212,175,78,.6)] sm:p-9">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(244,227,168,.7),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.08] text-gold transition-all duration-500 group-hover:scale-105 group-hover:border-gold/55 group-hover:bg-gold/[0.14]">
                  <Icon
                    className="relative h-[1.35rem] w-[1.35rem]"
                    aria-hidden="true"
                    strokeWidth={1.5}
                  />
                </span>

                <h3 className="mt-8 font-display text-fluid-1 font-light leading-snug text-text transition-colors duration-300 group-hover:text-white">
                  {point.title}
                </h3>
                <p className="mt-3 text-fluid--1 font-light leading-7 text-text-muted">
                  {point.body}
                </p>

                <span
                  aria-hidden="true"
                  className="mt-8 block h-px w-10 bg-gold/35 transition-all duration-500 group-hover:w-20 group-hover:bg-gold"
                />
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={150} className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={openValuationModal}
          className={buttonClasses({ size: "lg" })}
        >
          Get Your Cash Offer
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </Reveal>
    </Section>
  );
}
