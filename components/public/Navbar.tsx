"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Menu, Phone, X } from "lucide-react";
import { Logo } from "./Logo";
import { brand } from "@/config/brand";
import { copy } from "@/config/copy";
import { cn } from "@/lib/utils";
import { openValuationModal } from "./open-valuation-modal";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "We Buy", href: "#vehicle-discovery" },
  { label: "Brands", href: "#brands" },
  { label: "Process", href: "#sell-your-car" },
  { label: "Contact", href: "#contact" },
];

const UTILITY_LINK_CLASS =
  "inline-flex min-h-8 items-center gap-1.5 text-[0.72rem] font-semibold text-white/80 transition-colors hover:text-gold";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#home");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter(Boolean) as Element[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-white/10 bg-[#080807]/82 text-text backdrop-blur-2xl transition-shadow duration-200",
        scrolled && "shadow-[0_24px_54px_-36px_rgba(0,0,0,.95)]",
      )}
    >
      <div className="border-b border-white/10 bg-black/35">
        <div className="container flex min-h-9 items-center justify-between gap-4 py-1">
          <div className="hidden items-center gap-2 text-[0.72rem] font-semibold uppercase text-white/80 sm:flex">
            <MapPin className="h-3.5 w-3.5 text-gold" />
            <span>{brand.address}</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:flex-none sm:justify-end">
            <a href={`tel:${brand.callNumber}`} className={UTILITY_LINK_CLASS}>
              <Phone className="h-3.5 w-3.5 text-gold" />
              <span>{brand.callNumber}</span>
            </a>
            <span className="hidden h-3 w-px bg-white/20 sm:block" />
            <a
              href={brand.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className={UTILITY_LINK_CLASS}
              aria-label="Open CarVibeDubai Instagram"
            >
              Instagram
            </a>
            <a
              href={brand.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-8 items-center text-[0.72rem] font-semibold text-white/70 transition-colors hover:text-white sm:inline-flex"
              aria-label="Open CarVibeDubai Facebook"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>

      <nav className="container flex h-[4.5rem] items-center justify-between gap-5">
        <Link href="#home" className="min-w-0">
          <Logo tone="dark" />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          <ul className="flex items-center gap-6">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={cn(
                    "relative inline-flex h-10 items-center text-[0.78rem] font-bold uppercase text-text-muted transition-colors hover:text-text",
                    active === link.href &&
                      "text-text after:absolute after:bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-gold",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={openValuationModal}
            className="btn-gold inline-flex h-10 items-center justify-center rounded-full px-5 text-[0.78rem] font-extrabold uppercase transition-all hover:brightness-110"
          >
            Free Valuation
          </button>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-gold/65 bg-bg/60 text-text backdrop-blur-md lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="animate-fade-in border-t border-white/10 bg-[#080807]/95 text-text backdrop-blur-2xl lg:hidden">
          <ul className="container flex flex-col gap-1 py-4">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-card px-2 py-3 text-fluid-0 font-semibold text-text-muted hover:bg-white/5 hover:text-text"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <a
                href={`tel:${brand.callNumber}`}
                className="mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-btn border border-border-gold/65 bg-bg/55 px-5 text-fluid-0 font-bold text-text transition-colors hover:border-gold"
              >
                <Phone className="h-4 w-4 text-gold" />
                Call {brand.callNumber}
              </a>
              <button
                type="button"
                className="btn-gold flex h-11 w-full items-center justify-center rounded-btn px-5 text-fluid-0 font-bold"
                onClick={() => {
                  setOpen(false);
                  openValuationModal();
                }}
              >
                {copy.hero.cta}
              </button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
