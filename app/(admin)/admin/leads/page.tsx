import { Suspense } from "react";
import { LeadsTable } from "@/components/admin/leads-table";
import { LeadsTableSkeleton } from "@/components/admin/leads-table/skeleton";
import { Card } from "@/components/ui/Card";
import { DemoLeadControls } from "@/components/admin/DemoLeadControls";

export default function AdminLeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-fluid-3 text-text">Leads Directory</h1>
          <p className="mt-1 text-fluid--1 text-text-muted">Search, filter, and follow up on every valuation request.</p>
        </div>
        <DemoLeadControls />
      </div>
      <Suspense
        fallback={
          <Card className="p-5">
            <LeadsTableSkeleton />
          </Card>
        }
      >
        <LeadsTable />
      </Suspense>
    </div>
  );
}
