import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { Lead } from "@/config/mock-data";
import { formatDate, formatPhoneDisplay } from "@/lib/format";

export function RecentLeads({ leads, isLoading }: { leads: Lead[]; isLoading?: boolean }) {
  const recent = leads.slice(0, 5);

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
        <p className="py-8 text-center text-fluid--1 text-text-faint">No leads yet — share your link.</p>
      ) : (
        <div className="overflow-x-auto">
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
      )}
    </Card>
  );
}
