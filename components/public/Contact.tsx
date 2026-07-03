import { ArrowRight, Clock, LucideIcon, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { brand, whatsappLink } from "@/config/brand";
import { copy } from "@/config/copy";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

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
    <Section id="contact">
      <SectionHeader align="split" eyebrow="Concierge Desk" title={copy.contact.title} intro={copy.contact.sub} />

      <div className="mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[1.08fr_.92fr] lg:gap-10">
        <div className="rounded-card border border-white/5 bg-panel p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-caps text-gold">Private Line</p>
              <h3 className="mt-3 font-display text-fluid-2 font-bold leading-tight tracking-tight text-text">
                Start with one direct message.
              </h3>
              <p className="mt-4 text-fluid--1 leading-7 text-text-muted">
                Send the car details, preferred schedule, and how urgent the sale is. The next step stays clear and
                private.
              </p>
            </div>

            <div className="hairline-t pt-7 md:border-l md:border-t-0 md:border-white/5 md:pl-8 md:pt-0">
              <p className="font-display text-fluid-4 font-bold leading-none text-gold">15 min</p>
              <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-caps text-text-faint">
                Response window
              </p>
              <a
                href={whatsappLink("Hi, I'd like to get my free car valuation.")}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ size: "lg", className: "mt-6 w-full sm:w-auto" })}
              >
                Message on WhatsApp
                <ArrowRight className="h-4 w-4" />
              </a>
              <div className="mt-5 flex items-start gap-3 text-fluid--1 leading-6 text-text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                Private handling for urgent sales, rare models, and collections.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0">
          {CONTACT_DETAILS.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="h-5 w-5 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-caps text-text-faint">{item.label}</p>
                  <p className="mt-1.5 break-words text-fluid-0 leading-6 text-text">{item.value}</p>
                </div>
              </>
            );

            const className = "group flex min-h-14 items-center gap-4 py-5 transition-colors hover:text-gold sm:py-6";

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
    </Section>
  );
}
