"use client";

import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";
import { BrandMarquee } from "./BrandMarquee";

export function BrandBrowse() {
  return (
    <section id="brands" className="relative scroll-mt-28 overflow-hidden bg-bg py-section sm:scroll-mt-32">
      <div className="container">
        <Reveal>
          <SectionHeader
            align="split"
            eyebrow="Brands We Buy"
            title="The brands we buy."
            intro="Don't see your badge below? No problem - we review almost every make and model, so reach out and let's talk."
          />
        </Reveal>
      </div>

      <Reveal delay={120} className="mt-12 lg:mt-16">
        <div className="relative border-y border-white/10 bg-white/[0.02]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(212,175,78,.1),transparent_75%)] blur-2xl"
          />
          <div className="relative">
            <BrandMarquee />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
