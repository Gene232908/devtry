import { businessStats, trustPoints } from "@/config/homepage";

export function WhyChooseUs() {
  return (
    <section id="why-us" className="relative overflow-hidden border-y border-border-gold/35 bg-[#0e0c09] py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(120deg,rgba(212,175,55,.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,.025),transparent_60%)]"
      />
      <div className="container relative">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-36">
            <p className="text-fluid--1 font-bold uppercase text-gold">Why Choose Us</p>
            <h2 className="mt-4 max-w-xl font-display text-fluid-4 font-extrabold leading-[1.02] text-text">
              Built for confident decisions in the UAE car market.
            </h2>
            <p className="mt-5 max-w-lg text-fluid-0 leading-8 text-text-muted">
              CarVibeDubai should feel trustworthy from the first scroll: clear process, private follow-up, and a premium path for sellers and future buyers.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-gold/45 bg-border-gold/35">
              {businessStats.map((stat) => (
                <div key={stat.label} className="bg-[#11100e] p-4">
                  <p className="font-display text-fluid-2 font-extrabold text-gold">{stat.value}</p>
                  <p className="mt-2 text-[0.72rem] font-semibold uppercase leading-5 text-text-faint">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {trustPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <article
                  key={point.title}
                  className="grid grid-cols-1 gap-5 rounded-card border border-border-gold/45 bg-[linear-gradient(135deg,rgba(20,20,20,.96),rgba(8,8,8,.82))] p-5 transition-colors hover:border-gold/75 sm:grid-cols-[auto_1fr]"
                >
                  <div className="flex items-center gap-4 sm:flex-col sm:items-start">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border-gold/70 text-gold">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-fluid-2 font-extrabold text-border-gold">0{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-fluid-1 font-bold text-text">{point.title}</h3>
                    <p className="mt-3 max-w-2xl text-fluid--1 leading-7 text-text-muted">{point.body}</p>
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
