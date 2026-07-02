import Image from "next/image";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { featuredVehicles } from "@/config/homepage";

export function FeaturedVehicles() {
  return (
    <section id="featured-vehicles" className="relative overflow-hidden bg-[#090909] py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(212,175,55,.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.025),transparent_55%)]"
      />
      <div className="container relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[.86fr_1.14fr] lg:items-end">
          <div>
            <p className="text-fluid--1 font-bold uppercase text-gold">Vehicle Profiles</p>
            <h2 className="mt-4 max-w-xl font-display text-fluid-4 font-extrabold leading-[1.02] text-text text-balance">
              Show what can be evaluated, without pretending there is live stock.
            </h2>
          </div>
          <p className="max-w-2xl text-fluid-0 leading-8 text-text-muted lg:justify-self-end">
            These cards give the page richer automotive visuals while staying honest: they are valuation examples, not confirmed inventory listings or guaranteed offers.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {featuredVehicles.map((vehicle) => (
            <article
              key={vehicle.name}
              className="group overflow-hidden rounded-card border border-border-gold/45 bg-[linear-gradient(180deg,rgba(20,20,20,.96),rgba(8,8,8,.92))] transition-all duration-300 hover:-translate-y-1 hover:border-gold/75"
            >
              <div className="relative h-72 overflow-hidden">
                <Image
                  src={vehicle.image}
                  alt={`${vehicle.name} valuation profile`}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  style={{ objectPosition: vehicle.imagePosition }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.86))]" />
                <div className="absolute left-4 top-4 rounded-full border border-gold/55 bg-bg/70 px-3 py-1 text-[0.68rem] font-bold uppercase text-gold backdrop-blur-md">
                  {vehicle.badge}
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-display text-fluid-2 font-extrabold leading-tight text-text">{vehicle.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {vehicle.meta.map((item) => (
                      <span key={item} className="rounded-full border border-white/20 bg-bg/70 px-2.5 py-1 text-[0.74rem] text-text-muted backdrop-blur-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-gold/65 text-gold">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[0.7rem] font-bold uppercase text-text-faint">Market note</p>
                    <p className="mt-1 font-display text-fluid-1 font-bold text-gold">{vehicle.demand}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-card border border-border-gold/35 bg-bg/50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <p className="text-fluid--1 leading-6 text-text-muted">{vehicle.reviewFocus}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
