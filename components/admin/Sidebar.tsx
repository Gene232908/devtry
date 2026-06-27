"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  BarChart3,
  Package,
  Users,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ENABLED = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: ListChecks },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const COMING_SOON = [
  { label: "Analytics", icon: BarChart3 },
  { label: "Inventory", icon: Package },
  { label: "Users", icon: Users },
  { label: "Website", icon: Globe },
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

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 px-3 text-fluid--1 text-text-faint">Coming soon</p>
        {COMING_SOON.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-card px-3 py-2.5 text-fluid--1 text-text-faint opacity-60"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <Lock className="h-3.5 w-3.5" />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
