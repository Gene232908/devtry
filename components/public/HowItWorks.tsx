import { Banknote, CalendarCheck, ClipboardCheck, Gauge, LucideIcon, Search, ShieldCheck } from "lucide-react";
import { copy } from "@/config/copy";

const ICONS: Record<string, LucideIcon> = {
  ClipboardCheck,
  CalendarCheck,
  Search,
  Banknote,
};

const routeSteps = [
  ["01", "Online request", "Name, WhatsApp, car details, and area are captured first."],
  ["02", "WhatsApp appointment", "The team confirms the next step directly with the seller."],
  ["03", "Home inspection", "The car is checked in person before final offer and payment."],
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-28 overflow-hidden border-b border-border-gold/70 bg-[#090909] py-16 sm:scroll-mt-32 sm:py-24"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,rgba(212,175,55,.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.025),transparent_42%)]" />
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(243,222,138,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(243,222,138,.55)_1px,transparent_1px)] [background-size:80px_80px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(243,222,138,.65),transparent)]" />

      <div className="container relative">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-fluid--1 uppercase tracking-[0.3em] text-gold">Approved Selling Flow</p>
            <h2 className="mt-4 max-w-xl font-display text-fluid-4 leading-[1.02] text-text text-balance">
              {copy.howItWorks.title}
            </h2>
            <p className="mt-5 max-w-xl text-fluid-0 leading-8 text-text-muted">{copy.howItWorks.sub}</p>
          </div>

          <div className="rounded-card border border-border-gold/55 bg-bg/70 p-3 shadow-[0_24px_80px_-58px_rgba(243,222,138,.8)] backdrop-blur-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {copy.hero.stats.map((stat) => (
                <div key={stat.label} className="border border-border-gold/35 bg-surface/35 px-4 py-4">
                  <p className="font-display text-fluid-2 leading-none text-gold">{stat.value}</p>
                  <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-faint">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <aside className="relative overflow-hidden rounded-card border border-border-gold/55 bg-[linear-gradient(180deg,rgba(22,22,22,.92),rgba(10,10,10,.78))] p-6 shadow-[0_26px_90px_-62px_rgba(243,222,138,.85)]">
            <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,rgba(243,222,138,.75),transparent)]" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-fluid--1 uppercase tracking-[0.28em] text-text-faint">Lead Route</p>
                <h3 className="mt-3 font-display text-fluid-3 leading-tight text-text">From free valuation to home inspection.</h3>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-gold/70 bg-bg/80 text-gold">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </div>

            <div className="relative mt-10 space-y-7">
              <div className="absolute left-[1.05rem] top-3 h-[calc(100%-1.5rem)] w-px bg-[linear-gradient(180deg,rgba(243,222,138,.9),rgba(74,61,31,.2))]" />
              {routeSteps.map(([number, title, body]) => (
                <div key={title} className="relative flex gap-4">
                  <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/75 bg-bg font-display text-fluid--1 text-gold">
                    {number}
                  </span>
                  <div>
                    <p className="font-semibold text-text">{title}</p>
                    <p className="mt-1 text-fluid--1 leading-6 text-text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-start gap-3 border-t border-border-gold/35 pt-5 text-fluid--1 leading-6 text-text-muted">
              <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              Built around quick follow-up, clear lead status, and practical inspection areas.
            </div>
          </aside>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {copy.howItWorks.steps.map((step, i) => {
              const Icon = ICONS[step.icon];
              const stagger = i % 2 === 1 ? "lg:translate-y-8 lg:hover:translate-y-7" : "";

              return (
                <article
                  key={step.title}
                  className={`group relative overflow-hidden rounded-card border border-border-gold/45 bg-[linear-gradient(140deg,rgba(20,20,20,.92),rgba(9,9,9,.72))] p-5 shadow-[0_22px_70px_-54px_rgba(243,222,138,.8)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/80 lg:min-h-[260px] ${stagger}`}
                >
                  <div className="absolute right-0 top-0 h-20 w-20 border-b border-l border-border-gold/35 bg-gold/5" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-text-faint">Step</p>
                      <p className="mt-2 font-display text-fluid-3 leading-none text-gold">{String(i + 1).padStart(2, "0")}</p>
                    </div>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-gold/80 bg-bg/80 text-gold shadow-[0_0_28px_-16px_rgba(243,222,138,.9)] transition-colors group-hover:border-gold">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-8 h-px w-16 bg-gold/55" />
                  <h3 className="mt-6 font-display text-fluid-1 leading-tight text-text">{step.title}</h3>
                  <p className="mt-3 text-fluid--1 leading-6 text-text-muted">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
