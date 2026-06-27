"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { copy } from "@/config/copy";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Valuation", href: "#valuation" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

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
        "sticky top-0 z-40 w-full border-b transition-colors duration-200",
        scrolled ? "border-border-gold bg-bg/85 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <nav className="container flex h-20 items-center justify-between">
        <Link href="#home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={cn(
                  "relative pb-1 text-fluid--1 uppercase tracking-wider text-text-muted transition-colors hover:text-text",
                  active === link.href && "text-gold after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gold",
                )}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Button size="sm" className="hidden lg:inline-flex" onClick={() => document.querySelector("#valuation")?.scrollIntoView({ behavior: "smooth" })}>
          Get Valuation
        </Button>

        <button
          type="button"
          className="p-2 text-text lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border-gold bg-bg lg:hidden animate-fade-in">
          <ul className="container flex flex-col gap-1 py-4">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-card px-2 py-3 text-fluid-0 text-text-muted hover:bg-surface-2 hover:text-text"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  document.querySelector("#valuation")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {copy.hero.cta}
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
