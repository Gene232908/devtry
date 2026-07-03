import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { brand } from "@/config/brand";
import { copy } from "@/config/copy";

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Admin", href: "/admin" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-bg">
      <div aria-hidden="true" className="divider-gold-fade absolute inset-x-0 top-0" />
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[17vw] font-extrabold uppercase leading-none tracking-tight text-white/[0.02]"
      >
        {brand.name}
      </p>

      <div className="container relative py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_.9fr_.7fr] lg:items-start">
          <div>
            <Logo />
            <p className="mt-5 max-w-md text-fluid--1 leading-7 text-text-muted">{copy.footer.tagline}</p>
            <a
              href="#home"
              className="mt-6 inline-flex min-h-10 items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-caps text-gold transition-colors hover:text-gold-hi"
            >
              Start from free valuation
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-caps text-text-faint">Showroom Area</p>
                <p className="mt-1.5 text-fluid--1 leading-6 text-text-muted">{brand.address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-caps text-text-faint">Direct Line</p>
                <a
                  href={`tel:${brand.callNumber}`}
                  className="mt-1.5 inline-flex items-center py-1 text-fluid--1 leading-6 text-text-muted transition-colors hover:text-gold"
                >
                  {brand.callNumber}
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <nav className="flex flex-wrap gap-x-7 gap-y-3 text-[0.72rem] font-semibold uppercase tracking-caps text-text-faint lg:justify-end">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="py-1 transition-colors hover:text-gold">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.72rem] font-semibold uppercase tracking-caps text-text-faint lg:justify-end">
              <a
                href={brand.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 transition-colors hover:text-gold"
              >
                Facebook
              </a>
              <a
                href={brand.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 transition-colors hover:text-gold"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="hairline-t mt-12 flex flex-col gap-3 pt-6 text-fluid--1 text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>
            Copyright {new Date().getFullYear()} {brand.name}. All rights reserved.
          </span>
          <span>{brand.credit}</span>
        </div>
      </div>
    </footer>
  );
}
