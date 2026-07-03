import { businessStats, trustPoints } from "@/config/homepage";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

export function WhyChooseUs() {
  return (
    <Section id="why-us">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-16">
        <div className="lg:sticky lg:top-36">
          <SectionHeader
            eyebrow="Why Choose Us"
            title="Built for confident decisions in the UAE car market."
            intro="CarVibeDubai should feel trustworthy from the first scroll: clear process, private follow-up, and a premium path for sellers and future buyers."
          />

          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
            {businessStats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-fluid-3 font-bold leading-none text-gold">{stat.value}</p>
                <p className="mt-2 text-[0.7rem] font-semibold uppercase leading-5 tracking-caps text-text-faint">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {trustPoints.map((point, index) => (
            <article key={point.title} className="grid gap-x-4 gap-y-2 py-7 first:pt-0 sm:grid-cols-[3.5rem_1fr]">
              <span className="font-display text-fluid-1 font-semibold text-gold/70">0{index + 1}</span>
              <div>
                <h3 className="font-display text-fluid-1 font-semibold text-text">{point.title}</h3>
                <p className="mt-2 max-w-xl text-fluid--1 leading-7 text-text-muted">{point.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
