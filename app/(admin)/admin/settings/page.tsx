"use client";

import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config/brand";

type Manager = { id: string; email: string };

export default function AdminSettingsPage() {
  const [whatsapp, setWhatsapp] = useState(brand.whatsappNumber);
  const [call, setCall] = useState(brand.callNumber);
  const [notifyEmail, setNotifyEmail] = useState(brand.notifyEmail);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [managers, setManagers] = useState<Manager[]>([{ id: "m1", email: "sales@carvibedubai.com" }]);
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addManager() {
    if (!newManagerEmail.trim()) return;
    setManagers((m) => [...m, { id: crypto.randomUUID(), email: newManagerEmail.trim() }]);
    setNewManagerEmail("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-fluid-3 text-text">Settings</h1>
        <p className="mt-1 text-fluid--1 text-text-muted">Business contact details and dashboard preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Business contact</h3>
          <Input label="WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <Input label="Call number" value={call} onChange={(e) => setCall(e.target.value)} />
          <p className="text-fluid--1 text-text-faint">These power the WhatsApp FAB and Contact section on the public site.</p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Notifications</h3>
          <Input label="Notify email (Gmail)" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} />
          <label className="flex items-center gap-2.5 text-fluid--1 text-text-muted">
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border-gold bg-surface-2 accent-[--gold]"
            />
            Email me when a new lead arrives
          </label>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-fluid-0 text-text">Managers</h3>
          <ul className="flex flex-col gap-2">
            {managers.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-card bg-surface-2 px-3 py-2 text-fluid--1 text-text">
                {m.email}
                <button
                  type="button"
                  aria-label="Remove manager"
                  onClick={() => setManagers((all) => all.filter((x) => x.id !== m.id))}
                  className="text-text-faint hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="manager@email.com"
              value={newManagerEmail}
              onChange={(e) => setNewManagerEmail(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={addManager}>
              <UserPlus className="h-4 w-4" /> Invite
            </Button>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>Save changes</Button>
        {saved && <span className="text-fluid--1 text-success">Saved.</span>}
      </div>
    </div>
  );
}
