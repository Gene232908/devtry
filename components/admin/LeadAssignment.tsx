"use client";

import { useState } from "react";
import { UserPlus, UserCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { StaffOption, LeadAssignment as AssignmentPayload } from "@/lib/admin/lead-assignment";

type Props = {
  assignment: AssignmentPayload;
  staffOptions: StaffOption[];
  canAssign: boolean;
  onSave: (assignment: AssignmentPayload) => Promise<boolean>;
};

export function LeadAssignment({ assignment, staffOptions, canAssign, onSave }: Props) {
  const [draft, setDraft] = useState<AssignmentPayload>(assignment);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = draft.callCenterId !== assignment.callCenterId || draft.purchaserId !== assignment.purchaserId;

  const callCenterOptions = staffOptions
    .filter((s) => s.role === "call_center")
    .map((s) => ({ label: s.name, value: s.id }));

  const purchaserOptions = staffOptions
    .filter((s) => s.role === "purchaser")
    .map((s) => ({ label: s.name, value: s.id }));

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const ok = await onSave(draft);
    setSaving(false);
    if (!ok) {
      setSaveError("Failed to save assignment.");
    }
  }

  const callCenterStaff = staffOptions.find(s => s.id === assignment.callCenterId);
  const purchaserStaff = staffOptions.find(s => s.id === assignment.purchaserId);

  if (!canAssign) {
    if (!assignment.callCenterId && !assignment.purchaserId) return null;
    return (
      <Card className="flex flex-col gap-3 p-5">
        <h3 className="text-fluid-0 text-text">Team Assignment</h3>
        <div className="flex flex-col gap-2">
          {callCenterStaff && (
            <div className="flex items-center gap-2 text-fluid--1 text-text-muted">
              <UserCircle2 className="h-4 w-4" /> Call Centre: <span className="text-text">{callCenterStaff.name}</span>
            </div>
          )}
          {purchaserStaff && (
            <div className="flex items-center gap-2 text-fluid--1 text-text-muted">
              <UserCircle2 className="h-4 w-4" /> Purchaser: <span className="text-text">{purchaserStaff.name}</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-fluid-0 text-text">Team Assignment</h3>
        {dirty && <span className="text-fluid--1 text-warning">Unsaved</span>}
      </div>

      <div className="flex flex-col gap-4">
        <Select
          label="Call Centre"
          placeholder="Unassigned"
          options={[{ label: "Unassigned", value: "" }, ...callCenterOptions]}
          value={draft.callCenterId ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, callCenterId: v || null }))}
        />
        <Select
          label="Purchaser"
          placeholder="Unassigned"
          options={[{ label: "Unassigned", value: "" }, ...purchaserOptions]}
          value={draft.purchaserId ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, purchaserId: v || null }))}
        />
      </div>

      {dirty && (
        <div className="flex flex-col gap-2 mt-2">
          <Button loading={saving} disabled={saving} onClick={() => void handleSave()} className="w-full">
            <UserPlus className="h-4 w-4" /> Assign Team
          </Button>
          {saveError && <p className="text-center text-fluid--1 text-danger">{saveError}</p>}
        </div>
      )}
    </Card>
  );
}
