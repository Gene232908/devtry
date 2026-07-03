import Image from "next/image";
import { Check, ShieldCheck } from "lucide-react";
import { evaluationProfiles } from "@/config/homepage";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

const REVIEW_POINTS = [
  "Brand, model, year, and trim",
  "Mileage, condition, and accident history",
  "Inspection emirate and document readiness",
];

export function VehicleDiscovery() {
  return (
    <Section id="vehicle-discovery">
      <SectionHeader
        align="split"
        eyebrow="What CarVibeDubai Evaluates"
        title="More than a form. A cleaner way to prepare a serious car offer."
        intro="The free valuation form stays as the starting point. After the customer submits it, the team can review the car type, condition, mileage, and documents before discussing the next step."
      />

      <div className="mt-12 grid grid-cols-1 gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-card">
            <Image
              src="/images/carvibe-premium-evaluation-showcase.jpg"
              alt="Premium vehicles prepared for CarVibeDubai valuation review"
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            <div className="relative flex min-h-[420px] flex-col justify-end p-5 sm:min-h-[520px] sm:p-8">
              <div className="max-w-xl">
                <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-caps text-gold backdrop-blur-md">
                  Seller-first intake
                </span>
                <h3 className="mt-4 font-display text-fluid-3 font-bold leading-tight tracking-tight text-text">
                  Built for owners who want a private, polished valuation.
                </h3>
              </div>
            </div>
          </div>

          <ul className="mt-6 flex flex-col gap-x-8 gap-y-3 sm:flex-row sm:flex-wrap">
            {REVIEW_POINTS.map((item) => (
              <li key={item} className="inline-flex items-center gap-2.5 text-fluid--1 text-text-muted">
                <Check className="h-4 w-4 shrink-0 text-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:col-span-5">
          <div className="divide-y divide-white/5">
            {evaluationProfiles.map((profile, index) => (
              <article key={profile.label} className="grid grid-cols-[2.75rem_1fr] py-5 first:pt-0">
                <span className="font-display text-fluid-0 font-bold leading-7 text-gold">0{index + 1}</span>
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h4 className="font-display text-fluid-1 font-semibold text-text">{profile.label}</h4>
                    <span className="text-[0.68rem] font-semibold uppercase tracking-caps text-text-faint">
                      {profile.metric}
                    </span>
                  </div>
                  <p className="mt-2 text-fluid--1 leading-7 text-text-muted">{profile.body}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="hairline-t mt-2 flex gap-3 pt-5 text-fluid--1 leading-6 text-text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
            <p>
              No fake live inventory is shown here. This section supports Milestone 1 by helping visitors understand
              the kinds of vehicles the team can review. Final offer logic, database records, and document handling
              still need approval before backend implementation.
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}
