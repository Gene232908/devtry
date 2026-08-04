export function formatAed(value: number | null | undefined) {
  if (value == null) return "—";
  return `AED ${value.toLocaleString("en-US")}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPhoneDisplay(e164: string) {
  return e164.replace(/^(\+971)(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3 $4");
}

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  pending: "Pending",
  contacted: "Contacted",
  inspection_scheduled: "Inspection Scheduled",
  inspected: "Inspected",
  negotiating: "Under Negotiation",
  deal: "Deal",
  closed: "Not Purchased",
  // Retired from the UI but kept so historical rows still render a label
  // instead of blank. Never offered as a choice anywhere.
  valuation_sent: "Valuation Sent",
};

/**
 * The pipeline in order. "deal" means the customer agreed to sell; "closed"
 * means the meet-up happened and no deal was reached.
 */
export const LEAD_PIPELINE = [
  "new",
  "pending",
  "contacted",
  "inspection_scheduled",
  "inspected",
  "negotiating",
  "deal",
  "closed",
] as const;

/**
 * Statuses selectable inside Customer Details. Only forward moves are offered.
 * "new" and "pending" are both real states — a lead arrives as New and becomes
 * Pending the moment someone opens it — but neither can be chosen, because
 * picking them would mean claiming a lead had gone backwards to "not looked at
 * yet". The current state is still shown; it just cannot be re-selected.
 */
export const DETAIL_STATUS_OPTIONS = [
  "contacted",
  "inspection_scheduled",
  "inspected",
  "negotiating",
  "deal",
  "closed",
] as const;

/**
 * What each status actually means. Shown on hover in the status dropdown —
 * "Deal" and "Closed" in particular are easy to read backwards, and picking the
 * wrong one misreports whether a car was actually bought.
 */
export const STATUS_HINT: Record<string, string> = {
  new: "Nobody has opened this lead yet.",
  pending: "Opened and being worked on, but not contacted yet.",
  contacted: "You have reached out to the customer.",
  inspection_scheduled: "A viewing is booked but has not happened yet.",
  inspected: "You met the customer and saw the car in person.",
  negotiating: "You have seen the car and are still agreeing a price.",
  deal: "The customer agreed to sell — you bought the car.",
  closed: "You met but did not agree — the car was not bought.",
};

/** Statuses offered in the Leads Directory filter. */
export const FILTER_STATUS_OPTIONS = [
  "new",
  "pending",
  "contacted",
  "inspection_scheduled",
  "inspected",
  "negotiating",
  "deal",
  "closed",
] as const;

/**
 * The purchase price is asked for at "Deal" and nowhere else — that is the
 * moment the car was actually bought, and it is the figure the developer's
 * share is later calculated against. Every earlier status is a stage in a
 * conversation where no money has changed hands, so there is nothing truthful
 * to record yet; "Closed" means no car was bought at all.
 *
 * This replaced the old Estimated Value prompt, which asked for a guess on
 * every status. The column still exists on `leads` and historical figures are
 * intact — it is simply no longer shown or collected.
 */
export function requiresPurchasePrice(status: string): boolean {
  return status === "deal";
}
