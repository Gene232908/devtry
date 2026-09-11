"use client";

import { type LeadEvent } from "@/lib/admin/lead-events";

/**
 * Notes history is now integrated directly into LeadActivityCard
 * with a dedicated modal and overflow-safe typography.
 * Kept for backwards compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LeadNotesHistoryCard(props: { events: LeadEvent[] }) {
  return null;
}
