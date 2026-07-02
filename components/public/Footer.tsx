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
    <footer className="relative overflow-hidden border-t border-border-gold/70 bg-[#080808]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover opacity-[0.06]"
        style={{
          backgroundImage: "url('/images/carvibe-valuation-desk.jpg')",
          backgroundPosition: "50% center",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(243,222,138,.75),transparent)]" />

      <div className="container relative py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-9 lg:grid-cols-[1.1fr_.9fr_.7fr] lg:items-start">
          <div>
            <Logo />
            <p className="mt-5 max-w-md text-fluid--1 leading-7 text-text-muted">{copy.footer.tagline}</p>
            <a
              href="#home"
              className="mt-6 inline-flex items-center gap-2 text-fluid--1 font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:text-gold-hi"
            >
              Start from free valuation
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex gap-3 rounded-card border border-border-gold/40 bg-surface/35 p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-fluid--1 uppercase tracking-[0.18em] text-text-faint">Showroom Area</p>
                <p className="mt-1 text-fluid--1 leading-6 text-text-muted">{brand.address}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-card border border-border-gold/40 bg-surface/35 p-4">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-fluid--1 uppercase tracking-[0.18em] text-text-faint">Direct Line</p>
                <a href={`tel:${brand.callNumber}`} className="mt-1 block text-fluid--1 leading-6 text-text-muted hover:text-gold">
                  {brand.callNumber}
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:items-end">
            <nav className="flex flex-wrap gap-x-7 gap-y-3 text-fluid--1 uppercase tracking-[0.18em] text-text-muted lg:justify-end">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gold">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-fluid--1 uppercase tracking-[0.18em] text-text-muted lg:justify-end">
              <a href={brand.socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
                Facebook
              </a>
              <a href={brand.socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border-gold/35 pt-6 text-fluid--1 text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>Copyright {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
          <span>{brand.credit}</span>
        </div>
      </div>
    </footer>
  );
}
