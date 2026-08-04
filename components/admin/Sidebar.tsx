"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Settings, Ban, FileClock, Car, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

// Ordered to follow the car itself: leads come in, a deal turns one into stock,
// stock is sold. Inventory sits directly after Leads because that is the
// handover point between the two.
const ENABLED = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: ListChecks },
  { href: "/admin/inventory", label: "Inventory", icon: Car },
  { href: "/admin/commission", label: "Commission", icon: Percent },
  { href: "/admin/incomplete", label: "Incomplete Forms", icon: FileClock },
  { href: "/admin/blocked", label: "Blocked Numbers", icon: Ban },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex h-full w-60 flex-col gap-1 border-r border-border-gold bg-bg-elev p-4", className)}>
      {ENABLED.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-card px-3 py-2.5 text-fluid--1 transition-colors",
              active ? "bg-gold/15 text-gold" : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
