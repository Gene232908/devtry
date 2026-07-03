import Image from "next/image";
import { featuredVehicles } from "@/config/homepage";
import { cn } from "@/lib/utils";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

export function FeaturedVehicles() {
  return (
    <Section id="featured-vehicles">
      <SectionHeader
        align="split"
        eyebrow="Vehicle Profiles"
        title="Show what can be evaluated, without pretending there is live stock."
        intro="These cards give the page richer automotive visuals while staying honest: they are valuation examples, not confirmed inventory listings or guaranteed offers."
      />

      <div className="mt-12 grid grid-cols-1 gap-5 lg:mt-16 lg:grid-cols-2">
        {featuredVehicles.map((vehicle, index) => {
          const isLead = index === 0;
          return (
            <article
              key={vehicle.name}
              className={cn(
                "group relative overflow-hidden rounded-card",
                isLead ? "h-[320px] sm:h-[420px] lg:col-span-2" : "h-72 sm:h-80",
              )}
            >
              <Image
                src={vehicle.image}
                alt={`${vehicle.name} valuation profile`}
                fill
                sizes={isLead ? "100vw" : "(min-width: 1024px) 50vw, 100vw"}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                style={{ objectPosition: vehicle.imagePosition }}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <span className="inline-flex rounded-full bg-black/60 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-caps text-gold backdrop-blur-md">
                  {vehicle.badge}
                </span>
              </div>

              <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
                <h3 className="font-display text-fluid-2 font-bold leading-tight tracking-tight text-text">
                  {vehicle.name}
                </h3>
                <p className="mt-2 text-fluid--1 text-text-muted">{vehicle.meta.join(" · ")}</p>
                <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-caps text-gold">{vehicle.demand}</p>
                <p
                  className={cn(
                    "mt-1.5 max-w-2xl text-fluid--1 leading-6 text-text-muted",
                    !isLead && "hidden sm:block",
                  )}
                >
                  {vehicle.reviewFocus}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
