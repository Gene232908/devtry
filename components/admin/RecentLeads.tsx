import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { Lead } from "@/config/mock-data";
import { formatDate, formatPhoneDisplay } from "@/lib/format";

export function RecentLeads({ leads, isLoading }: { leads: Lead[]; isLoading?: boolean }) {
  // Deliberately New-only. This panel exists to answer "what needs attention
  // right now?", and anything already picked up belongs in the Leads page, not
  // here — showing worked leads would bury the ones nobody has touched yet.
  const recent = leads.filter((lead) => lead.status === "new").slice(0, 5);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fluid-0 text-text">Recent Leads</h3>
        <Link href="/admin/leads" className="text-fluid--1 text-gold hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border pb-3">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-4 w-32 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="ml-auto h-6 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="py-8 text-center text-fluid--1 text-text-faint">No new leads today.</p>
      ) : (
        <>
          {/* Mobile Streamlined View (Client Name priority, no table overflow) */}
          <div className="block md:hidden divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-surface-1/40 overflow-hidden">
            {recent.map((lead) => {
              const clientName = lead.fullName?.trim() || "Valuation Customer";
              const carSummary = lead.make ? `${lead.year} ${lead.make} ${lead.model}` : "Vehicle details pending";
              return (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="group flex items-center justify-between p-3.5 transition-all hover:bg-white/[0.03] active:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 font-display text-xs font-bold">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-text text-sm group-hover:text-gold transition-colors truncate">
                        {clientName}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-text-faint truncate mt-0.5">
                        <span className="truncate text-text-muted">{carSummary}</span>
                        <span>•</span>
                        <span className="shrink-0">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={lead.status} />
                    <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-gold transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-fluid--1">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="py-2 pr-4 font-normal">Client Name</th>
                  <th className="py-2 pr-4 font-normal">Mobile</th>
                  <th className="py-2 pr-4 font-normal">Car</th>
                  <th className="py-2 pr-4 font-normal">Date</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-text">
                      <Link href={`/admin/leads/${lead.id}`} className="hover:text-gold">
                        {lead.fullName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{formatPhoneDisplay(lead.phoneE164)}</td>
                    <td className="py-3 pr-4 text-text-muted">
                      {lead.year} {lead.make} {lead.model}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{formatDate(lead.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
