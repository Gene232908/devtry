import { NextResponse } from "next/server";
import { ADMIN_PREVIEW, PREVIEW_NOTICE } from "@/lib/admin/preview-mode";

// MILESTONE 2 BRANCH ONLY.
//
// Server-side half of the dashboard preview. The UI already hides and disables
// every write, but a UI guard is not a guarantee: anything holding an admin
// session could still call these endpoints directly. Refusing here means the
// preview cannot alter real data no matter how it is reached.
//
// Read endpoints are left alone — they are already gated by middleware, and the
// admin screens never call them while the preview is on.

/** Returns a 403 to short-circuit a write endpoint, or null to let it proceed. */
export function blockedByPreview(): NextResponse | null {
  if (!ADMIN_PREVIEW) return null;
  return NextResponse.json({ ok: false, error: { message: PREVIEW_NOTICE } }, { status: 403 });
}
