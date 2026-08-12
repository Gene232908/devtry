import BlockedNumbersClient from "./blocked-client";
import { fetchBlockedNumbers } from "@/lib/admin/queries";
import { ADMIN_PREVIEW } from "@/lib/admin/preview-mode";
import { demoBlockedNumbers, demoSuspiciousNumbers } from "@/config/demo-admin-data";

export const dynamic = "force-dynamic";

// Only reached when the query itself failed, so there are no rows to measure
// against anyway. Zeroes keep the shape valid without inventing ceilings.
const EMPTY_CAPS = { global: 0, phone: 0, ip: 0, unverified: 0 };

/**
 * Server half of Blocked Numbers. See `inventory/page.tsx` for the reasoning —
 * the client fetch this replaces re-entered middleware for a second auth check
 * before reaching the query that now runs inline here.
 */
export default async function AdminBlockedPage() {
  // Preview mode never touches the real blocklist.
  if (ADMIN_PREVIEW) {
    return (
      <BlockedNumbersClient
        initialBlocked={demoBlockedNumbers}
        initialSuspicious={demoSuspiciousNumbers}
        // Preview mode never reads the guard tables, so there is nothing
        // truthful to show here — an empty report rather than invented rows.
        initialLimits={{ rows: [], caps: EMPTY_CAPS }}
        initialError={null}
      />
    );
  }

  const result = await fetchBlockedNumbers();

  return (
    <BlockedNumbersClient
      initialBlocked={result.ok ? result.data.blocked : []}
      initialSuspicious={result.ok ? result.data.recentSuspicious : []}
      initialLimits={result.ok ? result.data.otpLimits : { rows: [], caps: EMPTY_CAPS }}
      initialError={result.ok ? null : result.message}
    />
  );
}
