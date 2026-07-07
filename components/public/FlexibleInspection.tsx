import { inspectionOptions } from "@/config/homepage";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

export function FlexibleInspection() {
  return (
    <Section id="inspection" divider="hairline">
      <Reveal>
        <SectionHeader
          eyebrow="Inspection, Your Way"
          title="We come to you, or we meet halfway."
          intro="Home, office, or a convenient public spot - we agree on a location that works for both sides before the inspection begins."
        />
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16">
        {inspectionOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <Reveal key={option.title} delay={index * 120}>
              <article className="group relative flex h-full items-start gap-6 overflow-hidden rounded-card border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-[0_28px_70px_-40px_rgba(212,175,55,.55)] sm:p-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.14),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card border border-gold/30 bg-gold/10 text-gold transition-colors duration-300 group-hover:border-gold/60 group-hover:bg-gold/15">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-[0.72rem] font-medium uppercase tracking-[0.22em] text-gold/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display text-fluid-1 font-light text-text">{option.title}</h3>
                  </div>
                  <p className="mt-3 text-fluid--1 font-light leading-7 text-text-muted">{option.body}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={150}>
        <div className="mt-8 flex flex-col items-center gap-4 rounded-card border border-white/10 bg-white/[0.02] px-6 py-5 sm:flex-row sm:justify-between">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-text-faint">
            Coverage across all 7 Emirates
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {EMIRATES.map((emirate) => (
              <span key={emirate} className="text-fluid--1 font-light text-text-muted">
                {emirate}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
