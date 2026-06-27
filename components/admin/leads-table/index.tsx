"use client";

import { ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLeads } from "@/lib/admin/leads-store";
import { useLeadsFilter } from "@/lib/admin/use-leads-filter";
import { exportLeadsCsv } from "@/lib/admin/export-csv";
import { LeadsToolbar } from "./toolbar";
import { LeadRow } from "./row";
import { Pagination } from "./pagination";

export function LeadsTable() {
  const { leads, updateLead } = useLeads();
  const filter = useLeadsFilter(leads);

  return (
    <Card className="p-5">
      <LeadsToolbar
        search={filter.search}
        onSearch={filter.setSearch}
        status={filter.status}
        onStatus={filter.setStatus}
        make={filter.make}
        onMake={filter.setMake}
        onExport={() => exportLeadsCsv(filter.allFiltered)}
        count={filter.totalCount}
      />

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-fluid--1">
          <thead>
            <tr className="border-b border-border text-text-faint">
              <th className="py-2 pr-4 font-normal">Client Name</th>
              <th className="py-2 pr-4 font-normal">
                <button className="flex items-center gap-1" onClick={() => filter.toggleSort("mobile")}>
                  Mobile <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2 pr-4 font-normal">Car Details</th>
              <th className="py-2 pr-4 font-normal">Mileage</th>
              <th className="py-2 pr-4 font-normal">
                <button className="flex items-center gap-1" onClick={() => filter.toggleSort("date")}>
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2 pr-4 font-normal">
                <button className="flex items-center gap-1" onClick={() => filter.toggleSort("value")}>
                  Est. Value <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2 pr-4 font-normal">Status</th>
              <th className="py-2 pr-1 font-normal text-right">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {filter.pageItems.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onStatusChange={(status) => updateLead(lead.id, { status })} />
            ))}
          </tbody>
        </table>

        {filter.pageItems.length === 0 && (
          <p className="py-10 text-center text-fluid--1 text-text-faint">No leads match your filters.</p>
        )}
      </div>

      <Pagination page={filter.page} totalPages={filter.totalPages} onPageChange={filter.setPage} />
    </Card>
  );
}
