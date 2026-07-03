import { bodyTypes } from "@/config/homepage";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

export function BodyTypeBrowse() {
  return (
    <Section id="body-types">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
        <SectionHeader
          eyebrow="Vehicle Types We Evaluate"
          title="Different body styles, one clean valuation path."
          intro="These body styles help customers understand what CarVibeDubai can review before they submit the free valuation form."
        />

        <div className="overflow-hidden rounded-card border border-white/5 bg-white/5">
          <div className="grid grid-cols-2 gap-px md:grid-cols-3">
            {bodyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <article key={type.label} className="flex min-h-[130px] flex-col justify-between bg-bg p-5 sm:p-6">
                  <Icon className="h-5 w-5 text-gold" />
                  <div className="mt-6">
                    <h3 className="font-display text-fluid-0 font-semibold text-text">{type.label}</h3>
                    <p className="mt-1 text-[0.72rem] text-text-faint">{type.count}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
