"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, type LucideIcon } from "lucide-react";
import { Logo } from "./Logo";
import { brand } from "@/config/brand";
import { copy } from "@/config/copy";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const CONTACT_ROWS: Array<{ label: string; value: string; icon: LucideIcon; href?: string }> = [
  { label: "Showroom Area", value: brand.address, icon: MapPin },
  { label: "Hours", value: brand.hours, icon: Clock },
];

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M14 13.5h2.5l.5-3H14V8.5c0-.9.25-1.5 1.53-1.5H17V4.36C16.73 4.32 15.8 4.25 14.7 4.25c-2.3 0-3.87 1.4-3.87 3.97V10.5H8.5v3H10.83V21h3.17v-7.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.1" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RevealOnScroll({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const bandRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const band = bandRef.current;
    const video = videoRef.current;
    if (!band) return;

    let revealTimer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video) {
            video.currentTime = 0;
            video.play().catch(() => {});
          }
          revealTimer = setTimeout(() => setRevealed(true), 900);
        } else {
          video?.pause();
          clearTimeout(revealTimer);
          setRevealed(false);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(band);
    return () => {
      observer.disconnect();
      clearTimeout(revealTimer);
    };
  }, []);

  return (
    <footer id="footer" className="relative isolate overflow-hidden bg-bg">
      <div
        ref={bandRef}
        className="relative isolate flex min-h-[36svh] items-center justify-center overflow-hidden lg:min-h-[42svh]"
      >
        <video
          ref={videoRef}
          src="/videos/footer.mp4"
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onEnded={() => setRevealed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bg)_0%,rgba(0,0,0,.35)_32%,rgba(0,0,0,.35)_68%,var(--bg)_100%)]"
        />

        <div className="relative z-10 flex flex-col items-center px-6">
          <p
            className={cn(
              "text-[0.62rem] font-medium uppercase tracking-[0.52em] text-white/55 transition-all duration-1000 ease-out motion-reduce:transition-none",
              revealed ? "translate-y-0 opacity-100 delay-[650ms]" : "-translate-y-2 opacity-0",
            )}
          >
            Dubai &middot; United Arab Emirates
          </p>

          <div className="mt-4 overflow-hidden py-1">
            <p
              className={cn(
                "select-none whitespace-nowrap text-center font-display text-[clamp(2.1rem,1.2rem+5.2vw,6.6rem)] font-light uppercase leading-none tracking-[0.12em] text-white transition-all duration-[2600ms] ease-[cubic-bezier(.12,.72,.16,1)] will-change-[opacity,transform,filter] motion-reduce:transition-none motion-reduce:duration-0",
                revealed ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-4 scale-[0.9] opacity-0 blur-[18px]",
              )}
              style={{ textShadow: "0 4px 34px rgba(0,0,0,.55)" }}
            >
              {brand.name}
            </p>
          </div>

          <span
            aria-hidden="true"
            className={cn(
              "mt-6 h-px w-24 origin-center bg-gradient-to-r from-transparent via-gold/80 to-transparent transition-transform duration-[1100ms] ease-out motion-reduce:transition-none",
              revealed ? "scale-x-100 delay-[450ms]" : "scale-x-0",
            )}
          />

          <p
            className={cn(
              "mt-5 text-[0.6rem] font-light uppercase tracking-[0.44em] text-white/45 transition-all duration-1000 ease-out motion-reduce:transition-none",
              revealed ? "translate-y-0 opacity-100 delay-[850ms]" : "translate-y-2 opacity-0",
            )}
          >
            Premium Car Valuation
          </p>
        </div>
      </div>

      <div className="container relative z-10 -mt-4 pb-12">
        <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-2 lg:items-start lg:gap-x-20">
          <RevealOnScroll>
            <Logo />
            <p className="mt-6 max-w-sm text-fluid--1 font-light leading-7 text-text-muted">{copy.footer.tagline}</p>
            <a
              href="#home"
              className="mt-7 inline-flex min-h-10 items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-gold transition-colors hover:text-gold-hi"
            >
              Start a Free Valuation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </RevealOnScroll>

          <RevealOnScroll delay={120} className="lg:justify-self-end lg:text-right">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5">
              {CONTACT_ROWS.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex items-start gap-3 lg:flex-row-reverse lg:text-right">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-gold">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.64rem] font-medium uppercase tracking-[0.22em] text-text-faint">
                        {row.label}
                      </p>
                      <p className="mt-1.5 break-words text-fluid--1 font-light leading-6 text-text-muted">
                        {row.href ? (
                          <a href={row.href} className="transition-colors hover:text-gold">
                            {row.value}
                          </a>
                        ) : (
                          row.value
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </RevealOnScroll>
        </div>

        <div className="mt-14 flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <nav className="flex items-center gap-7 text-[0.72rem] font-light uppercase tracking-[0.16em] text-text-muted">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-gold">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={brand.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${brand.name} on Facebook`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-text-muted transition-colors hover:bg-gold/15 hover:text-gold"
            >
              <FacebookIcon />
            </a>
            <a
              href={brand.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${brand.name} on Instagram`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-text-muted transition-colors hover:bg-gold/15 hover:text-gold"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-[0.7rem] font-light text-text-faint sm:text-left">
          Copyright {year} {brand.name}. {brand.credit}
        </p>
      </div>
    </footer>
  );
}
