"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { LeadsProvider } from "@/lib/admin/leads-store";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";

// Routes that a signed-out visitor can reach. They must render bare: showing
// the sidebar and header around a login form implies the dashboard is already
// open, and after signing out it left the previous session's chrome on screen.
const CHROMELESS_ROUTES = ["/admin/login", "/admin/set-password"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const chromeless = CHROMELESS_ROUTES.includes(pathname);

  // LeadsProvider wraps BOTH branches deliberately. Mounting it only for the
  // dashboard meant that signing in — a client-side transition from /admin/login
  // to /admin — could render the dashboard before this layout's pathname
  // updated, leaving useLeads() with no context and crashing the page. It is
  // told not to fetch on the signed-out screens instead.
  return (
    <LeadsProvider enabled={!chromeless}>
      {chromeless ? (
        // Bare — these pages already centre themselves full-screen, and chrome
        // around a login form implies a session that does not exist.
        children
      ) : (
        <div className="flex h-screen flex-col bg-bg">
          <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar className="hidden lg:flex" />

            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-40 flex lg:hidden">
                <Sidebar className="flex" />
                <button
                  type="button"
                  aria-label="Close sidebar"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex-1 bg-black/60"
                >
                  <X className="m-4 h-6 w-6 text-text" />
                </button>
              </div>
            )}

            {/* Keyed on the path so the fade replays on every navigation, not
                just the first mount — arriving from the login screen and moving
                between admin pages should feel the same. */}
            <main key={pathname} className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in motion-reduce:animate-none">
              {ADMIN_PREVIEW && (
                // Stated on every screen so nobody in the walkthrough mistakes
                // a sample row for a real customer, or expects a click to stick.
                <div className="mb-5 flex items-start gap-3 rounded-card border border-gold/40 bg-gold/10 px-4 py-3">
                  <Eye className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <p className="text-fluid--1 leading-6 text-gold">
                    <span className="font-medium">Milestone 3 preview.</span> This dashboard is a design walkthrough —
                    every row shown is sample data, and nothing you change here is saved. The public valuation form and
                    phone verification are live and working.
                  </p>
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
      )}
    </LeadsProvider>
  );
}
