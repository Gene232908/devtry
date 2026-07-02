import Image from "next/image";
import { BadgeCheck, FileCheck, ShieldCheck, Sparkles } from "lucide-react";
import { evaluationProfiles } from "@/config/homepage";

const REVIEW_POINTS = [
  "Brand, model, year, and trim",
  "Mileage, condition, and accident history",
  "Inspection emirate and document readiness",
];

export function VehicleDiscovery() {
  return (
    <section
      id="vehicle-discovery"
      className="relative scroll-mt-28 overflow-hidden border-y border-border-gold/45 bg-[#090908] py-16 sm:scroll-mt-32 sm:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(212,175,55,.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.035),transparent_56%)]"
      />
      <div className="container relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-fluid--1 font-bold uppercase text-gold">What CarVibeDubai Evaluates</p>
            <h2 className="mt-4 max-w-2xl font-display text-fluid-4 font-extrabold leading-[1.02] text-text text-balance">
              More than a form. A cleaner way to prepare a serious car offer.
            </h2>
          </div>
          <p className="max-w-2xl text-fluid-0 leading-8 text-text-muted lg:justify-self-end">
            The free valuation form stays as the starting point. After the customer submits it, the team can review the car type, condition, mileage, and documents before discussing the next step.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <div className="relative overflow-hidden rounded-card border border-border-gold/60 bg-bg min-h-[520px]">
            <Image
              src="/images/carvibe-premium-evaluation-showcase.jpg"
              alt="Premium vehicles prepared for CarVibeDubai valuation review"
              fill
              sizes="(min-width: 1280px) 52vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,.12),rgba(8,8,8,.9)),linear-gradient(90deg,rgba(8,8,8,.88),rgba(8,8,8,.3))]" />

            <div className="relative flex min-h-[520px] flex-col justify-end p-5 sm:p-8">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/55 bg-bg/55 px-3 py-2 text-fluid--1 font-bold uppercase text-gold backdrop-blur-md">
                  <Sparkles className="h-4 w-4" />
                  Seller-first intake
                </span>
                <h3 className="mt-5 font-display text-fluid-3 font-extrabold leading-tight text-text">
                  Built for owners who want a private, polished valuation.
                </h3>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {REVIEW_POINTS.map((item) => (
                    <div key={item} className="rounded-card border border-white/10 bg-bg/65 p-3 text-fluid--1 leading-6 text-text-muted backdrop-blur-md">
                      <BadgeCheck className="mb-3 h-4 w-4 text-gold" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="grid grid-cols-1 gap-4">
            <div className="rounded-card border border-border-gold/55 bg-[linear-gradient(145deg,rgba(22,22,22,.95),rgba(8,8,8,.86))] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-fluid--1 font-bold uppercase text-gold">Evaluation Lens</p>
                  <h3 className="mt-3 max-w-md font-display text-fluid-2 font-extrabold leading-tight text-text">
                    The page now explains what can be sold to CarVibeDubai.
                  </h3>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-gold/70 text-gold">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-fluid--1 leading-7 text-text-muted">
                No fake live inventory is shown here. This section supports Milestone 1 by helping visitors understand the kinds of vehicles the team can review.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {evaluationProfiles.map((profile) => {
                const Icon = profile.icon;
                return (
                  <article
                    key={profile.label}
                    className="group rounded-card border border-border-gold/45 bg-[linear-gradient(135deg,rgba(20,20,20,.92),rgba(8,8,8,.74))] p-4 transition-colors hover:border-gold/75"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-gold/65 bg-bg/70 text-gold">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="font-display text-fluid-1 font-bold text-text">{profile.label}</h4>
                          <span className="text-[0.68rem] font-bold uppercase text-gold">{profile.metric}</span>
                        </div>
                        <p className="mt-2 text-fluid--1 leading-6 text-text-muted">{profile.body}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="rounded-card border border-border-gold/45 bg-bg/50 p-4">
              <div className="flex items-start gap-3 text-fluid--1 leading-6 text-text-muted">
                <FileCheck className="mt-1 h-4 w-4 shrink-0 text-gold" />
                Final offer logic, database records, and document handling still need approval before backend implementation.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
