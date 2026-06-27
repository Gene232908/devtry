import { LeadsTable } from "@/components/admin/leads-table";

export default function AdminLeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Leads Directory</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">Search, filter, and follow up on every valuation request.</p>
      </div>
      <LeadsTable />
    </div>
  );
}
