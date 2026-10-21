"use client";

import { useState, useRef } from "react";
import { AlertCircle, ChevronDown, Loader2, PlusCircle, ShieldOff, UserCheck, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  staffDraftSchema,
  staffFieldErrors,
  ASSIGNABLE_ROLE_VALUES,
  type StaffDraft,
  type StaffSummary,
} from "@/lib/admin/staff-schema";
import { ROLE_LABELS, type StaffIdentity } from "@/lib/auth/permissions";

/**
 * StaffAccounts
 *
 * Displays the list of staff accounts and allows the owner to create, rename,
 * change role, and enable/disable them.
 *
 * State is intentionally isolated from the contact-settings form above it:
 * editing a phone number and editing a staff account are independent actions
 * and must not interfere with each other's dirty/saving state.
 */

type Props = {
  viewer: StaffIdentity;
  initialStaff: StaffSummary[];
  canManageStaff: boolean;
};

type MutationState = "idle" | "saving" | "error";

const EMPTY_DRAFT: StaffDraft = { email: "", displayName: "", role: "call_center" };

export function StaffAccounts({ viewer, initialStaff, canManageStaff }: Props) {
  const [staff, setStaff] = useState<StaffSummary[]>(initialStaff);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffSummary | null>(null);
  const [draft, setDraft] = useState<StaffDraft>(EMPTY_DRAFT);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [mutation, setMutation] = useState<MutationState>("idle");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setDraft(EMPTY_DRAFT);
    setDraftErrors({});
    setMutationError(null);
    setMutation("idle");
    setDialogOpen(true);
  }

  function openEdit(member: StaffSummary) {
    setEditTarget(member);
    setDraft({
      email: member.email,
      displayName: member.displayName,
      role: (member.role === "manager" ? "admin" : member.role) as StaffDraft["role"],
      password: "",
    });
    setDraftErrors({});
    setMutationError(null);
    setMutation("idle");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (mutation === "saving") return;
    setDialogOpen(false);
  }

  function updateDraft<K extends keyof StaffDraft>(key: K, value: StaffDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDraftErrors((e) => (key in e ? { ...e, [key]: "" } : e));
    setMutationError(null);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (inFlight.current) return;

    if (!editTarget && (!draft.password || draft.password.trim().length === 0)) {
      setDraftErrors({ password: "Password is required for new accounts." });
      return;
    }

    if (draft.password && draft.password.trim().length > 0 && draft.password.trim().length < 6) {
      setDraftErrors({ password: "Password must be at least 6 characters." });
      return;
    }

    const parsed = staffDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setDraftErrors(staffFieldErrors(parsed.error));
      return;
    }

    inFlight.current = true;
    setMutation("saving");
    setMutationError(null);

    try {
      if (editTarget) {
        // PATCH — rename, email, password, or change role
        const payload: Record<string, unknown> = {
          email: parsed.data.email,
          displayName: parsed.data.displayName,
          role: parsed.data.role,
        };
        if (parsed.data.password && parsed.data.password.trim().length >= 6) {
          payload.password = parsed.data.password.trim();
        }

        const res = await fetch(`/api/admin/staff/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          setMutation("error");
          const msg = json?.error?.message;
          setMutationError(
            msg && msg !== "{}"
              ? msg
              : `Save failed (${res.status}). Please check credentials or email.`,
          );
          return;
        }
        setStaff((prev) =>
          prev.map((m) => (m.id === editTarget.id ? { ...m, ...json.data.staff } : m)),
        );
      } else {
        // POST — create new account
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          setMutation("error");
          const msg = json?.error?.message;
          setMutationError(
            msg && msg !== "{}"
              ? msg
              : `Create failed (${res.status}). Please check credentials or email.`,
          );
          return;
        }
        setStaff((prev) => [...prev, json.data.staff as StaffSummary]);
      }

      setMutation("idle");
      setDialogOpen(false);
    } catch {
      setMutation("error");
      setMutationError("Network error — nothing was saved.");
    } finally {
      inFlight.current = false;
    }
  }

  // ─── Toggle active ────────────────────────────────────────────────────────

  async function toggleActive(member: StaffSummary) {
    if (inFlight.current) return;
    inFlight.current = true;

    const next = !member.isActive;
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(json?.error?.message ?? "Failed to update account status.");
        return;
      }
      setStaff((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, isActive: next } : m)),
      );
    } catch {
      alert("Network error — status not changed.");
    } finally {
      inFlight.current = false;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const saving = mutation === "saving";
  const operational = staff.filter(
    (m) => m.role === "call_center" || m.role === "purchaser",
  );
  const owners = staff.filter(
    (m) => m.role === "admin" || m.role === "manager",
  );

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-fluid-0 text-text">Staff accounts</h3>
          {canManageStaff && (
            <Button
              size="sm"
              variant="outline"
              onClick={openCreate}
              className="flex items-center gap-1.5"
              id="add-staff-btn"
            >
              <PlusCircle className="h-4 w-4" />
              Add staff
            </Button>
          )}
        </div>

        {/* Super Admins & Owners */}
        {owners.length > 0 && (
          <section>
            <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-wider text-text-faint">
              Super Admins & Owners
            </p>
            <ul className="flex flex-col gap-1.5">
              {owners.map((m) => {
                const isSelf = m.id === viewer.userId;
                return (
                  <StaffRow
                    key={m.id}
                    member={m}
                    canManage={canManageStaff}
                    isSelf={isSelf}
                    onEdit={() => openEdit(m)}
                    onToggleActive={isSelf ? undefined : () => void toggleActive(m)}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {/* Operational staff */}
        {operational.length > 0 && (
          <section>
            <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-wider text-text-faint">
              Operational staff
            </p>
            <ul className="flex flex-col gap-1.5">
              {operational.map((m) => {
                const isSelf = m.id === viewer.userId;
                return (
                  <StaffRow
                    key={m.id}
                    member={m}
                    canManage={canManageStaff}
                    isSelf={isSelf}
                    onEdit={() => openEdit(m)}
                    onToggleActive={isSelf ? undefined : () => void toggleActive(m)}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {staff.length === 0 && (
          <p className="text-fluid--1 text-text-faint">
            No staff accounts yet.{" "}
            {canManageStaff && 'Use "Add staff" to create a staff or Super Admin account.'}
          </p>
        )}

        {!canManageStaff && (
          <p className="text-fluid--1 text-text-faint">
            Only Super Admins can manage staff accounts.
          </p>
        )}
      </Card>

      {/* ─── Dialog ─────────────────────────────────────────────────────── */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={editTarget ? "Edit staff account" : "Add staff account"}
        >
          <div className="w-full max-w-md rounded-card border border-border bg-bg-elev shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-fluid-0 font-medium text-text">
                {editTarget ? "Edit staff account" : "Add staff account"}
              </h2>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={closeDialog}
                disabled={saving}
                className="rounded p-1 text-text-muted hover:text-text disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-4 p-5">
              <Input
                label="Email address"
                name="staff-email"
                type="email"
                value={draft.email}
                error={draftErrors.email}
                disabled={saving}
                placeholder="name@example.com"
                onChange={(e) => updateDraft("email", e.target.value)}
              />
              
              <Input
                label={editTarget ? "Password (leave blank to keep current)" : "Password"}
                name="staff-password"
                type="text"
                value={draft.password ?? ""}
                error={draftErrors.password}
                disabled={saving}
                placeholder={editTarget ? "Leave blank to keep unchanged" : "At least 6 characters"}
                onChange={(e) => updateDraft("password", e.target.value)}
              />

              <Input
                label="Display name"
                name="staff-displayName"
                value={draft.displayName}
                error={draftErrors.displayName}
                disabled={saving}
                placeholder="e.g. Maricel"
                onChange={(e) => updateDraft("displayName", e.target.value)}
              />

              {/* Role selector */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="staff-role"
                  className="text-fluid--1 font-medium text-text-muted"
                >
                  Role
                </label>
                <div className="relative">
                  <select
                    id="staff-role"
                    value={draft.role}
                    disabled={saving}
                    onChange={(e) =>
                      updateDraft("role", e.target.value as StaffDraft["role"])
                    }
                    className="w-full appearance-none rounded-card border border-border bg-surface-2 px-3 py-2.5 pr-8 text-fluid--1 text-text focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50"
                  >
                    {ASSIGNABLE_ROLE_VALUES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
                {draftErrors.role && (
                  <p className="text-[0.72rem] text-danger">{draftErrors.role}</p>
                )}
                <p className="text-[0.72rem] text-text-faint">
                  {draft.role === "admin"
                    ? "Full administrative access. Can manage staff, oversee all leads, financial reports, catalog, and settings."
                    : draft.role === "call_center"
                    ? "Can see assigned leads and contact info. Cannot see prices or commissions."
                    : "Can see assigned leads and prices. Cannot see contact info or commissions."}
                </p>
              </div>

              {mutation === "error" && mutationError && (
                <div className="flex items-start gap-2 rounded-card bg-danger/10 px-3 py-2.5 text-fluid--1 text-danger" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {mutationError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
              <Button variant="outline" onClick={closeDialog} disabled={saving} size="sm">
                Cancel
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={saving}
                size="sm"
                id="staff-submit-btn"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Save changes" : "Create account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Row sub-component ────────────────────────────────────────────────────────

type RowProps = {
  member: StaffSummary;
  canManage: boolean;
  isSelf?: boolean;
  onEdit: () => void;
  onToggleActive?: () => void;
};

function StaffRow({ member, canManage, isSelf, onEdit, onToggleActive }: RowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-card bg-surface-2 px-3 py-2 text-fluid--1">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`block truncate font-medium ${member.isActive ? "text-text" : "text-text-muted line-through"}`}>
            {member.displayName}
          </span>
          {isSelf && (
            <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-gold">
              You
            </span>
          )}
        </div>
        <span className="block truncate text-[0.72rem] text-text-faint">{member.email}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-[0.72rem] capitalize text-text-muted">
          {ROLE_LABELS[member.role] ?? member.role}
        </span>

        {!member.isActive && (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[0.72rem] text-danger">
            Disabled
          </span>
        )}

        {canManage && (
          <>
            <button
              type="button"
              aria-label={`Edit ${member.displayName}`}
              onClick={onEdit}
              className="rounded p-1 text-text-muted hover:text-text"
              title="Edit account (email, password, role)"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287.753 2.205 2.205-.63 6.287-6.422ZM12.5 2.502l-.75.75 1 1 .75-.75-.25-.25-.75-.75Z" />
              </svg>
            </button>

            {onToggleActive && !isSelf && (
              <button
                type="button"
                aria-label={member.isActive ? `Disable ${member.displayName}` : `Enable ${member.displayName}`}
                onClick={onToggleActive}
                className={`rounded p-1 ${member.isActive ? "text-text-muted hover:text-danger" : "text-success hover:text-success/80"}`}
                title={member.isActive ? "Disable account" : "Enable account"}
              >
                {member.isActive ? (
                  <ShieldOff className="h-3.5 w-3.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
