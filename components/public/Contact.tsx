import { ArrowRight, Clock, Headphones, LucideIcon, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { brand, whatsappLink } from "@/config/brand";
import { copy } from "@/config/copy";

const CONTACT_DETAILS: Array<{
  label: string;
  value: string;
  icon: LucideIcon;
  href?: string;
  external?: boolean;
}> = [
  {
    label: "WhatsApp",
    value: brand.whatsappNumber,
    icon: MessageCircle,
    href: whatsappLink("Hi, I'd like to get my free car valuation."),
    external: true,
  },
  { label: "Call", value: brand.callNumber, icon: Phone, href: `tel:${brand.callNumber}` },
  { label: "Hours", value: brand.hours, icon: Clock },
  { label: "Location", value: brand.address, icon: MapPin },
];

export function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-28 overflow-hidden bg-[#0b0a09] py-16 sm:scroll-mt-32 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(243,222,138,.7),transparent)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(212,175,55,.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,.025),transparent_55%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(212,175,55,.08))]" />

      <div className="container relative">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-fluid--1 uppercase tracking-[0.3em] text-gold">Concierge Desk</p>
            <h2 className="mt-4 max-w-xl font-display text-fluid-4 leading-[1.02] text-text text-balance">
              {copy.contact.title}
            </h2>
          </div>
          <p className="max-w-2xl text-fluid-0 leading-8 text-text-muted lg:justify-self-end">{copy.contact.sub}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <div className="relative overflow-hidden rounded-card border border-border-gold/65 bg-[linear-gradient(145deg,rgba(22,22,22,.96),rgba(8,8,8,.82))] p-6 shadow-[0_30px_90px_-62px_rgba(243,222,138,.85)] sm:p-8">
            <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,rgba(243,222,138,.75),transparent)]" />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-gold/70 bg-bg/80 text-gold">
                  <Headphones className="h-6 w-6" />
                </div>
                <p className="mt-7 text-fluid--1 uppercase tracking-[0.28em] text-text-faint">Private Line</p>
                <h3 className="mt-3 font-display text-fluid-3 leading-tight text-text">Start with one direct message.</h3>
                <p className="mt-4 text-fluid--1 leading-7 text-text-muted">
                  Send the car details, preferred schedule, and how urgent the sale is. The next step stays clear and private.
                </p>
              </div>

              <div className="relative border-t border-border-gold/35 pt-7 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <div className="flex items-center justify-between gap-5 border-b border-border-gold/35 pb-5">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-gold">Response window</p>
                    <p className="mt-2 font-display text-fluid-2 leading-none text-text">15 min</p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-gold" />
                </div>
                <a
                  href={whatsappLink("Hi, I'd like to get my free car valuation.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn px-6 text-fluid-0 font-semibold transition-all duration-200 hover:brightness-110 sm:w-auto"
                >
                  Message on WhatsApp
                  <ArrowRight className="h-4 w-4" />
                </a>
                <div className="mt-5 flex items-start gap-3 text-fluid--1 leading-6 text-text-muted">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  Private handling for urgent sales, rare models, and collections.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {CONTACT_DETAILS.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-gold/70 bg-bg/70 text-gold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-faint">{item.label}</p>
                    <p className="mt-2 break-words text-fluid-0 leading-6 text-text">{item.value}</p>
                  </div>
                </>
              );

              const className =
                "group flex min-h-[112px] items-center gap-4 rounded-card border border-border-gold/45 bg-[linear-gradient(120deg,rgba(20,20,20,.82),rgba(8,8,8,.68))] p-5 transition-colors hover:border-gold/75 hover:bg-surface-2/55";

              return item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <div key={item.label} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
