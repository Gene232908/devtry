"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useFreshServerData } from "@/lib/admin/use-fresh-server-data";
import {
  fieldErrors,
  settingsSchema,
  type Settings,
  type SettingsInput,
} from "@/lib/admin/settings-schema";


// Business contact details and dashboard preferences, stored in the `settings`
// table (single row, id = 1).
//
// This screen previously showed "Saved." on a two-second timer and wrote
// nothing at all: the values came from the hard-coded brand config, the Save
// button set a boolean, and the edit was gone on reload. The API route and the
// table it writes to already existed — the form simply never called them.
//
// Everything below is arranged around not repeating that. The success line is
// rendered from the server's response, never from the click; a rejected save
// says so; and leaving with unsaved edits is called out rather than passed off
// as saved.

type Props = {
  initialSettings: Settings | null;
  initialError: string | null;
  /** Managers may read this screen; only admins may write it. */
  canEdit: boolean;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type NotificationTestState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export default function SettingsClient({ initialSettings, initialError, canEdit }: Props) {
  useFreshServerData();

  // The last values known to be in the database. Drafts are compared against
  // this to decide whether anything is actually unsaved, and it is replaced by
  // the row the server echoes back after a write.
  const [persisted, setPersisted] = useState<SettingsInput | null>(() => toInput(initialSettings));
  const [draft, setDraft] = useState<SettingsInput | null>(() => toInput(initialSettings));

  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [notificationTest, setNotificationTest] = useState<NotificationTestState>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Guards against a double-submit racing itself. A ref rather than state
  // because it has to be correct synchronously, before React re-renders.
  const inFlight = useRef(false);

  const dirty = useMemo(() => {
    if (!draft || !persisted) return false;
    return (
      draft.whatsappNumber !== persisted.whatsappNumber ||
      draft.callNumber !== persisted.callNumber ||
      draft.notifyEmail !== persisted.notifyEmail
      || draft.referralIncentiveAed !== persisted.referralIncentiveAed
    );
  }, [draft, persisted]);

  // `useFreshServerData` re-renders this screen every 20 seconds, so a newer
  // row can arrive at any moment — including mid-sentence while someone is
  // typing in one of these boxes.
  //
  // A fresh row is therefore adopted only when there is nothing unsaved to
  // lose. Overwriting a draft with server values would silently discard the
  // edit, which is the same class of mistake as the fake save this screen was
  // fixed for: work disappears and nothing says so. While the form is dirty the
  // draft stands, and Save then decides the outcome.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Keyed on the CONTENT, not the object. Each server render produces a new
  // `initialSettings` object with identical values; depending on the reference
  // would re-run this every 20 seconds and, worse, set state on every run — a
  // render loop dressed up as a refresh.
  const serverFingerprint = initialSettings
    ? JSON.stringify([
        initialSettings.whatsappNumber,
        initialSettings.callNumber,
        initialSettings.notifyEmail,
        initialSettings.referralIncentiveAed,
      ])
    : "";

  useEffect(() => {
    if (!serverFingerprint) return;
    const incoming = JSON.parse(serverFingerprint) as [string, string, string, number];
    const next: SettingsInput = {
      whatsappNumber: incoming[0],
      callNumber: incoming[1],
      notifyEmail: incoming[2],
      referralIncentiveAed: incoming[3],
    };
    setPersisted(next);
    if (!dirtyRef.current) setDraft(next);
  }, [serverFingerprint]);

  const update = useCallback(<K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    // A stale "Saved." under a field being edited would be a lie about the
    // current contents, so it clears the moment anything changes.
    setSave((s) => (s.kind === "saved" ? { kind: "idle" } : s));
    setErrors((e) => (key in e ? { ...e, [key]: "" } : e));
  }, []);

  async function handleSave() {
    if (!draft || inFlight.current || !canEdit) return;

    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setSave({ kind: "error", message: "Please correct the highlighted fields." });
      return;
    }

    inFlight.current = true;
    setErrors({});
    setSave({ kind: "saving" });

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => null);

      // Success is claimed only on an explicit ok from the server.
      if (!res.ok || !json?.ok) {
        if (json?.error?.fields) setErrors(json.error.fields as Record<string, string>);
        setSave({
          kind: "error",
          message: json?.error?.message ?? `Couldn't save (${res.status}). Your changes are still here.`,
        });
        return;
      }

      // Adopt what the database actually stored, rather than assuming the
      // submitted values were taken verbatim.
      const saved = toInput(json.data.settings as Settings);
      if (saved) {
        setPersisted(saved);
        setDraft(saved);
      }
      setSave({ kind: "saved" });
    } catch {
      setSave({ kind: "error", message: "Network error — nothing was saved. Your changes are still here." });
    } finally {
      inFlight.current = false;
    }
  }

  async function handleNotificationTest() {
    if (!canEdit || dirty || notificationTest.kind === "sending") return;
    setNotificationTest({ kind: "sending" });

    try {
      const res = await fetch("/api/admin/settings/test-notification", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setNotificationTest({
          kind: "error",
          message: json?.error?.message ?? "Couldn't send the test email. Please try again.",
        });
        return;
      }
      setNotificationTest({ kind: "sent" });
    } catch {
      setNotificationTest({ kind: "error", message: "Network error. The test email was not confirmed." });
    }
  }

  if (initialError || !draft) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <Card className="flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-fluid-0 text-text">Settings couldn&apos;t be loaded.</p>
            <p className="mt-1 text-fluid--1 text-text-muted">{initialError ?? "No settings row was found."}</p>
          </div>
        </Card>
      </div>
    );
  }

  const saving = save.kind === "saving";

  return (
    <div className="flex flex-col gap-6">
      <Header />

      {!canEdit && (
        <Card className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p className="text-fluid--1 leading-6 text-text-muted">
            You can see these settings but not change them. Editing is limited to admin accounts.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Business contact</h3>
          <Input
            label="WhatsApp number"
            name="whatsappNumber"
            value={draft.whatsappNumber}
            error={errors.whatsappNumber}
            disabled={!canEdit || saving}
            onChange={(e) => update("whatsappNumber", e.target.value)}
          />
          <Input
            label="Call number"
            name="callNumber"
            value={draft.callNumber}
            error={errors.callNumber}
            disabled={!canEdit || saving}
            onChange={(e) => update("callNumber", e.target.value)}
          />
          <p className="text-fluid--1 text-text-faint">
            These power the WhatsApp and Call buttons on the public site.
          </p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Notifications</h3>
          <Input
            label="Notify email"
            name="notifyEmail"
            value={draft.notifyEmail}
            error={errors.notifyEmail}
            disabled={!canEdit || saving}
            placeholder="owner@carvibedubai.com"
            onChange={(e) => update("notifyEmail", e.target.value)}
          />
          <p className="text-fluid--1 text-text-faint">Leave empty to switch lead notifications off.</p>
          <p className="text-fluid--1 text-text-faint">
            Every new lead is sent to this saved address. Save a change first, then send a test to confirm it.
          </p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Referral incentive</h3>
          <Input
            label="Incentive amount (AED)"
            name="referralIncentiveAed"
            type="number"
            min="0"
            step="0.01"
            value={String(draft.referralIncentiveAed)}
            error={errors.referralIncentiveAed}
            disabled={!canEdit || saving}
            onChange={(e) => update("referralIncentiveAed", Number(e.target.value))}
          />
          <p className="text-fluid--1 text-text-faint">This amount is frozen when a referred vehicle is marked Sold. Changing it affects future sales only.</p>
        </Card>


      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void handleSave()} disabled={!canEdit || saving || !dirty}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>

        {save.kind === "saved" && !dirty && <span className="text-fluid--1 text-success">Saved.</span>}

        {save.kind === "error" && (
          <span className="flex items-center gap-1.5 text-fluid--1 text-danger" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {save.message}
          </span>
        )}

        {/* Unsaved edits are stated rather than left to be discovered on
            reload. */}
        {dirty && save.kind !== "error" && !saving && (
          <span className="text-fluid--1 text-text-faint">Unsaved changes.</span>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleNotificationTest()}
          disabled={!canEdit || saving || dirty || notificationTest.kind === "sending" || !persisted?.notifyEmail}
        >
          {notificationTest.kind === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          {notificationTest.kind === "sending" ? "Sending test..." : "Send test email"}
        </Button>

        {notificationTest.kind === "sent" && (
          <span className="text-fluid--1 text-success">Test email sent to the saved Notify email.</span>
        )}

        {notificationTest.kind === "error" && (
          <span className="flex items-center gap-1.5 text-fluid--1 text-danger" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {notificationTest.message}
          </span>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-fluid-3 text-text">Settings</h1>
      <p className="mt-1 text-fluid--1 text-text-muted">Business contact details and dashboard preferences.</p>
    </div>
  );
}

function toInput(s: Settings | null): SettingsInput | null {
  if (!s) return null;
  return {
    whatsappNumber: s.whatsappNumber,
    callNumber: s.callNumber,
    notifyEmail: s.notifyEmail,
    referralIncentiveAed: s.referralIncentiveAed,
  };
}
