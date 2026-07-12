"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { openValuationModal } from "./open-valuation-modal";

const COMING_SOON_LABELS = ["Buy"];

const NAV_ITEMS = [
  { label: "Sell", href: "#why-sell-to-us" },
  { label: "How It Works", href: "#sell-your-car" },
  { label: "Brands", href: "#brands" },
  { label: "Buy", badge: "Coming soon" },
  { label: "Contact Us", href: "#footer" },
];

const SECTION_IDS = NAV_ITEMS.filter((item) => item.href).map((item) => item.href!.slice(1));

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function handleNavClick(href: string) {
    setActiveId(href.slice(1));
  }

  useEffect(() => {
    if (!comingSoonOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setComingSoonOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [comingSoonOpen]);

  return (
    <header className="fixed inset-x-0 top-8 z-50 px-4 pt-4 text-text sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
        <Link href="#home" className="min-w-0">
          <Logo compact className="[&>span:nth-child(2)>span:last-child]:hidden" />
        </Link>

        <div className="hidden items-center rounded-full border border-white/15 bg-white/15 px-2 py-1 text-[0.74rem] font-medium text-white/85 shadow-[0_18px_45px_-30px_rgba(0,0,0,.95)] backdrop-blur-xl lg:flex">
          {NAV_ITEMS.map((item, index) => {
            const isActive = Boolean(item.href) && activeId === item.href!.slice(1);
            const itemClassName = cn(
              "group relative flex min-h-8 items-center gap-1.5 px-4 transition-colors hover:text-white",
              index > 0 && "border-l border-white/18",
              isActive ? "text-gold" : "text-white/85",
            );

            const underline = (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -bottom-[5px] left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-gold transition-all duration-300",
                  isActive ? "w-5 opacity-100" : "w-0 opacity-0 group-hover:w-4 group-hover:opacity-60",
                )}
              />
            );

            if (COMING_SOON_LABELS.includes(item.label)) {
              return (
                <button key={item.label} type="button" onClick={() => setComingSoonOpen(true)} className={itemClassName}>
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.56rem] font-medium uppercase text-gold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            }

            return (
              <a
                key={item.label}
                href={item.href}
                onClick={() => handleNavClick(item.href!)}
                aria-current={isActive ? "true" : undefined}
                className={itemClassName}
              >
                <span>{item.label}</span>
                {underline}
                {item.badge ? (
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.56rem] font-medium uppercase text-gold">
                    {item.badge}
                  </span>
                ) : null}
              </a>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={openValuationModal}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-gold bg-black/35 px-4 text-[0.72rem] font-medium text-gold transition-colors hover:bg-gold hover:text-black"
          >
            Call Now
            <Phone className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={openValuationModal}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-gold px-4 text-[0.72rem] font-semibold text-black transition-colors hover:bg-gold-hi"
          >
            Message Us
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-text backdrop-blur-md lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-3 max-w-[1180px] animate-fade-in rounded-[24px] border border-white/12 bg-black/80 p-3 text-text shadow-[0_24px_70px_-40px_rgba(0,0,0,.95)] backdrop-blur-2xl lg:hidden">
          <div className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              if (COMING_SOON_LABELS.includes(item.label)) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setComingSoonOpen(true);
                    }}
                    className="flex min-h-11 items-center justify-between rounded-full px-4 text-fluid--1 font-medium text-text-muted hover:bg-white/8 hover:text-text"
                  >
                    <span>{item.label}</span>
                    {item.badge ? <span className="text-[0.62rem] uppercase text-gold">{item.badge}</span> : null}
                  </button>
                );
              }

              const isActive = Boolean(item.href) && activeId === item.href!.slice(1);

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    handleNavClick(item.href!);
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 items-center justify-between rounded-full px-4 text-fluid--1 font-medium hover:bg-white/8 hover:text-text",
                    isActive ? "bg-white/5 text-gold" : "text-text-muted",
                  )}
                >
                  <span>{item.label}</span>
                  {item.badge ? <span className="text-[0.62rem] uppercase text-gold">{item.badge}</span> : null}
                </a>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openValuationModal();
              }}
              className="inline-flex h-11 items-center justify-center rounded-full border border-gold text-fluid--1 font-medium text-gold"
            >
              Call Now
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openValuationModal();
              }}
              className="inline-flex h-11 items-center justify-center rounded-full bg-gold text-fluid--1 font-semibold text-black"
            >
              Message Us
            </button>
          </div>
        </div>
      )}

      {comingSoonOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/78 p-4 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Buy a car, coming soon"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setComingSoonOpen(false);
          }}
        >
          <div className="relative w-full max-w-sm rounded-card border border-border-gold/75 bg-[#10100f] p-7 text-center shadow-[0_0_0_1px_rgba(243,222,138,.12),0_28px_90px_-38px_rgba(243,222,138,.7)]">
            <button
              type="button"
              onClick={() => setComingSoonOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border-gold/60 bg-bg/70 text-text-muted transition-colors hover:border-gold hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-gold">Buy A Car</p>
            <h2 className="mt-3 font-display text-fluid-2 font-semibold text-text">Coming Soon</h2>
            <p className="mt-3 text-fluid--1 font-light leading-6 text-text-muted">
              Our buy-a-car marketplace is launching soon. For now, get a free
              valuation and sell your car with CarVibeDubai today.
            </p>
            <button
              type="button"
              onClick={() => {
                setComingSoonOpen(false);
                openValuationModal();
              }}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-gold text-fluid--1 font-semibold text-black transition-colors hover:bg-gold-hi"
            >
              Get Free Valuation Instead
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
