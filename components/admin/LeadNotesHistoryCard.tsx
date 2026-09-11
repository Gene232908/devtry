"use client";

import { type LeadEvent } from "@/lib/admin/lead-events";

/**
 * Notes history is now integrated directly into LeadActivityCard
 * with a dedicated modal and overflow-safe typography.
 * Kept for backwards compatibility.
 */
export function LeadNotesHistoryCard({ events: _events }: { events: LeadEvent[] }) {
  return null;
}
