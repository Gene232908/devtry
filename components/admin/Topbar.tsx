"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, LogOut, ChevronDown, Menu } from "lucide-react";
import { Logo } from "@/components/public/Logo";
import { useLeads } from "@/lib/admin/leads-store";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { leads } = useLeads();
  const [menuOpen, setMenuOpen] = useState(false);
  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border-gold bg-bg-elev px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="p-1.5 text-text lg:hidden" onClick={onMenuClick} aria-label="Toggle sidebar">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin">
          <Logo />
        </Link>
        <span className="hidden text-fluid--1 text-text-faint sm:inline">| Admin</span>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="relative p-2 text-text-muted hover:text-text" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {newCount > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-danger" />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-card px-2 py-1.5 text-fluid--1 text-text hover:bg-surface-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 font-display text-gold">
              S
            </span>
            <span className="hidden sm:inline">Sir Nash</span>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-card border border-border-gold bg-surface py-1 card-shadow animate-fade-in">
              <Link href="/admin/settings" className="block px-4 py-2 text-fluid--1 text-text hover:bg-surface-2">
                Profile
              </Link>
              <Link href="/" className="flex items-center gap-2 px-4 py-2 text-fluid--1 text-text hover:bg-surface-2">
                <LogOut className="h-4 w-4" /> Sign out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
