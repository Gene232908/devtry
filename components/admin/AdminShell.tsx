"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { LeadsProvider } from "@/lib/admin/leads-store";
import { StaffIdentityProvider } from "@/lib/admin/staff-identity-context";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import type { StaffIdentity, Capability } from "@/lib/auth/permissions";

// Routes that a signed-out visitor can reach. They must render bare: showing
// the sidebar and header around a login form implies the dashboard is already
// open, and after signing out it left the previous session's chrome on screen.
const CHROMELESS_ROUTES = ["/admin/login", "/admin/set-password"];

type Props = {
  children: React.ReactNode;
  /** Server-resolved identity. Null during preview mode or before resolution. */
  identity: StaffIdentity | null;
};

export function AdminShell({ children, identity }: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const chromeless = CHROMELESS_ROUTES.includes(pathname);

  const capabilities: Capability[] | undefined = identity?.capabilities;

  // LeadsProvider wraps BOTH branches deliberately. Mounting it only for the
  // dashboard meant that signing in — a client-side transition from /admin/login
  // to /admin — could render the dashboard before this layout's pathname
  // updated, leaving useLeads() with no context and crashing the page. It is
  // told not to fetch on the signed-out screens instead.
  return (
    <StaffIdentityProvider identity={identity}>
      <LeadsProvider enabled={!chromeless}>
        {chromeless ? (
          // Bare — these pages already centre themselves full-screen, and chrome
          // around a login form implies a session that does not exist.
          children
        ) : (
          <div className="flex min-h-screen flex-col bg-bg overflow-x-hidden max-w-full">
            {/* Keep the header visible while the document, not a nested main, scrolls. */}
            <div className="sticky top-0 z-30">
              <Topbar onMenuClick={() => setMobileSidebarOpen(true)} identity={identity} />
            </div>
            <div className="flex min-w-0 flex-1">
              <Sidebar className="hidden lg:flex" capabilities={capabilities} />

              {mobileSidebarOpen && (
                <div className="fixed inset-0 z-40 flex lg:hidden animate-fade-in">
                  <Sidebar
                    className="flex w-72 max-w-[85vw] shadow-2xl h-full overflow-y-auto"
                    capabilities={capabilities}
                    onNavigate={() => setMobileSidebarOpen(false)}
                    isMobile
                  />
                  <button
                    type="button"
                    aria-label="Close sidebar"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex-1 bg-black/70 backdrop-blur-sm transition-opacity"
                  >
                    <X className="m-4 h-6 w-6 text-text" />
                  </button>
                </div>
              )}

              <main className="min-w-0 flex-1 p-4 sm:p-6 overflow-x-hidden max-w-full">
                <div key={pathname} className="animate-fade-in motion-reduce:animate-none">
                  {ADMIN_PREVIEW && (
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
                </div>
              </main>
            </div>
          </div>
        )}
      </LeadsProvider>
    </StaffIdentityProvider>
  );
}
