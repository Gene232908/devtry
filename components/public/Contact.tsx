import Image from "next/image";
import { ArrowRight, Clock, LucideIcon, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { brand, whatsappLink } from "@/config/brand";
import { copy } from "@/config/copy";
import { landingImages } from "@/config/homepage";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

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
    <Section id="contact" bleed className="overflow-hidden bg-bg">
      <div className="container">
        <Reveal>
          <SectionHeader align="split" eyebrow="Concierge Desk" title={copy.contact.title} intro={copy.contact.sub} />
        </Reveal>
      </div>

      <div className="mt-12 grid grid-cols-1 border-y border-white/10 lg:mt-16 lg:grid-cols-[1.1fr_.9fr]">
        <div className="px-6 py-10 sm:px-8 lg:py-14 lg:pl-[max(2rem,calc((100vw-1200px)/2))] lg:pr-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[0.82fr_1.18fr] md:items-center">
            <div>
              <p className="text-[0.7rem] font-medium uppercase text-gold">Private Line</p>
              <h3 className="mt-3 font-display text-fluid-2 font-light leading-tight text-text">
                Start with one direct message.
              </h3>
              <p className="mt-4 text-fluid--1 font-light leading-7 text-text-muted">
                Send the car details, preferred schedule, and how urgent the sale is. The next step stays clear and
                private.
              </p>
            </div>

            <div className="hairline-t pt-7 md:border-l md:border-t-0 md:border-white/5 md:pl-8 md:pt-0">
              <p className="font-display text-fluid-4 font-light leading-none text-gold">15 min</p>
              <p className="mt-2 text-[0.7rem] font-medium uppercase text-text-faint">Response window</p>
              <a
                href={whatsappLink("Hi, I'd like to get my free car valuation.")}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ size: "lg", className: "mt-6 w-full sm:w-auto" })}
              >
                Message on WhatsApp
                <ArrowRight className="h-4 w-4" />
              </a>
              <div className="mt-5 flex items-start gap-3 text-fluid--1 font-light leading-6 text-text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
                Private handling for urgent sales, rare models, and collections.
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 border-t border-white/10 pt-8 sm:grid-cols-2">
            {CONTACT_DETAILS.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-gold/25 bg-gold/10 text-gold transition-colors duration-300 group-hover:border-gold/60 group-hover:bg-gold/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-medium uppercase text-text-faint">{item.label}</p>
                    <p className="mt-1.5 break-words text-fluid-0 font-light leading-6 text-text">{item.value}</p>
                  </div>
                </>
              );

              const className =
                "group flex min-h-14 items-center gap-4 rounded-card border border-white/10 bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-white/[0.04]";

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

        <div className="relative min-h-[390px] overflow-hidden border-t border-white/10 lg:min-h-[560px] lg:border-l lg:border-t-0">
          <Image
            src={landingImages.contact}
            alt="Black premium SUV for CarVibeDubai concierge contact"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
            style={{ objectPosition: "54% center" }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/24 to-transparent" />
        </div>
      </div>
    </Section>
  );
}
