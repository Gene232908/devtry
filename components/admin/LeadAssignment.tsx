import { useMemo, useState } from "react";
import { UserCircle2, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { StaffOption, LeadAssignment as AssignmentPayload } from "@/lib/admin/lead-assignment";
import { useRouter } from "next/navigation";

type Props = {
  assignment: AssignmentPayload;
  staffOptions: StaffOption[];
  showPurchaser?: boolean;
  description?: string;
  leadId?: string;
  canAssign?: boolean;
};

/** Shows automatic ownership and exposes manual reassignment to Super Admin only. */
export function LeadAssignment({
  assignment,
  staffOptions,
  showPurchaser = true,
  description = "This lead is assigned automatically. View only.",
  leadId,
  canAssign = false,
}: Props) {
  const router = useRouter();
  const callCenterStaff = staffOptions.find((staff) => staff.id === assignment.callCenterId);
  const purchaserStaff = staffOptions.find((staff) => staff.id === assignment.purchaserId);
  const [callCenterId, setCallCenterId] = useState(assignment.callCenterId ?? "");
  const [purchaserId, setPurchaserId] = useState(assignment.purchaserId ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const callCenterOptions = useMemo(
    () => staffOptions.filter((staff) => staff.role === "call_center" && staff.isActive).map((staff) => ({ label: staff.name, value: staff.id })),
    [staffOptions],
  );
  const purchaserOptions = useMemo(
    () => staffOptions.filter((staff) => staff.role === "purchaser" && staff.isActive).map((staff) => ({ label: staff.name, value: staff.id })),
    [staffOptions],
  );
  const changed = callCenterId !== (assignment.callCenterId ?? "") || purchaserId !== (assignment.purchaserId ?? "");

  async function saveAssignment() {
    if (!leadId || !changed) return;
    if (!reason.trim()) {
      setError("Add a short reason before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callCenterId: callCenterId || null, purchaserId: purchaserId || null, reason: reason.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        setError(body?.error?.message ?? "Could not save the reassignment.");
        return;
      }
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-fluid-0 text-text">Assigned Team</h3>
        <p className="mt-1 text-fluid--1 text-text-faint">{canAssign ? "Automatic assignment is used first. You can change it here when there is a clear reason." : description}</p>
      </div>
      <div className="flex flex-col gap-3">
        {canAssign && leadId ? (
          <>
            <Select label="Call Centre" placeholder="Unassigned" options={callCenterOptions} value={callCenterId} onChange={setCallCenterId} />
            {showPurchaser && <Select label="Purchaser" placeholder="Unassigned" options={purchaserOptions} value={purchaserId} onChange={setPurchaserId} />}
            {changed && (
              <>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  placeholder="Why are you changing the assignment?"
                  className="w-full rounded-card border border-border bg-surface-2 p-3 text-sm text-text outline-none focus:border-gold"
                />
                <Button className="w-full" onClick={() => void saveAssignment()} disabled={saving} loading={saving}>
                  <Save className="h-4 w-4" /> Save reassignment
                </Button>
              </>
            )}
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
          </>
        ) : (
          <>
            <AssignmentRow label="Call Centre" staff={callCenterStaff} assigned={Boolean(assignment.callCenterId)} />
            {showPurchaser && <AssignmentRow label="Purchaser" staff={purchaserStaff} assigned={Boolean(assignment.purchaserId)} />}
          </>
        )}
      </div>
    </Card>
  );
}

function AssignmentRow({ label, staff, assigned }: { label: string; staff?: StaffOption; assigned: boolean }) {
  const name = staff ? `${staff.name}${staff.isActive ? "" : " (inactive)"}` : assigned ? "Assigned staff account unavailable" : "Unassigned";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <span className="flex items-center gap-2 text-fluid--1 text-text-muted">
        <UserCircle2 className="h-4 w-4 text-gold" />
        {label}
      </span>
      <span className={assigned ? "text-fluid--1 font-medium text-text" : "text-fluid--1 text-text-faint"}>
        {name}
      </span>
    </div>
  );
}
