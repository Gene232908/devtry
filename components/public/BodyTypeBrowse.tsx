import { bodyTypes } from "@/config/homepage";

export function BodyTypeBrowse() {
  return (
    <section id="body-types" className="relative overflow-hidden border-y border-border-gold/35 bg-[#0c0b09] py-16 sm:py-20">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="text-fluid--1 font-bold uppercase text-gold">Vehicle Types We Evaluate</p>
            <h2 className="mt-4 font-display text-fluid-3 font-extrabold leading-tight text-text">
              Different body styles, one clean valuation path.
            </h2>
            <p className="mt-4 text-fluid-0 leading-8 text-text-muted">
              These body styles help customers understand what CarVibeDubai can review before they submit the free valuation form.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {bodyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <article
                  key={type.label}
                  className="group relative min-h-[150px] overflow-hidden rounded-card border border-border-gold/45 bg-[linear-gradient(160deg,rgba(20,20,20,.96),rgba(8,8,8,.78))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gold/75"
                >
                  <div className="absolute -right-8 bottom-3 h-14 w-32 rounded-full border border-gold/20 bg-gold/5 transition-transform duration-300 group-hover:translate-x-[-6px]" />
                  <div className="relative flex h-full flex-col justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-gold/60 text-gold">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-fluid-1 font-bold text-text">{type.label}</h3>
                      <p className="mt-1 text-fluid--1 text-text-muted">{type.count}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
