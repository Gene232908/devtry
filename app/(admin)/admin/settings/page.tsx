import SettingsClient from "./settings-client";
import { fetchSettings } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/server/require-admin";

// Settings are read on every visit — never a cached copy, or the form would
// open on values that have since changed and save them straight back.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [result, admin] = await Promise.all([fetchSettings(), requireAdmin()]);

  return (
    <SettingsClient
      initialSettings={result.ok ? result.data.settings : null}
      initialError={result.ok ? null : result.message}
      canEdit={admin.ok}
    />
  );
}
