"use client";

import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";
import { LogoCarousel } from "@/components/ui/logo-carousel";
import { carLogos } from "./car-logos";

export function BrandBrowse() {
  return (
    <Section id="brands" className="overflow-hidden bg-bg">
      <Reveal>
        <SectionHeader
          align="split"
          eyebrow="Brands We Buy"
          title="Here are the brands we buy - and many more."
          intro="Don't see your exact brand below? No problem. We review almost every make and model, so reach out and let's talk."
        />
      </Reveal>

      <Reveal delay={120}>
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-12 backdrop-blur-sm sm:px-8 lg:mt-16 lg:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(212,175,78,.08),transparent_75%)] blur-2xl"
          />
          <div className="relative">
            <LogoCarousel columnCount={3} logos={carLogos} />
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
