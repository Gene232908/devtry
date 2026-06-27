import Link from "next/link";
import { Logo } from "./Logo";
import { brand } from "@/config/brand";
import { copy } from "@/config/copy";

export function Footer() {
  return (
    <footer className="border-t border-border-gold py-10">
      <div className="container flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-fluid--1 text-text-muted">{copy.footer.tagline}</p>
        </div>

        <div className="flex gap-8 text-fluid--1 text-text-muted">
          <Link href="/privacy" className="hover:text-gold">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gold">
            Terms
          </Link>
          <Link href="/admin" className="hover:text-gold">
            Admin
          </Link>
        </div>
      </div>

      <div className="container mt-8 flex flex-col gap-2 border-t border-border pt-6 text-fluid--1 text-text-faint sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
        <span>{brand.credit}</span>
      </div>
    </footer>
  );
}
