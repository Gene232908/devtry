export function formatAed(value: number | null | undefined) {
  if (value == null) return "—";
  return `AED ${value.toLocaleString("en-US")}`;
}
export function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}
export function formatMileage(value: number, unit: "km" | "miles" = "km") {
  return `${value.toLocaleString("en-US")} ${unit === "miles" ? "miles" : "km"}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function formatPhoneDisplay(e164: string | undefined | null) {
  if (!e164) return "—";
  return e164.replace(/^(\+971)(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3 $4");
}

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  inspection_scheduled: "Inspection Scheduled",
  no_show: "No Show",
  inspected: "Inspected",
  negotiating: "Under Negotiation",
  deal: "Deal",
  // Retired from active choices but kept so historical rows still render a label
  pending: "Pending",
  closed: "Not Purchased",
  valuation_sent: "Valuation Sent",
};

/**
 * The pipeline in order.
 */
export const LEAD_PIPELINE = [
  "new",
  "contacted",
  "inspection_scheduled",
  "no_show",
  "inspected",
  "negotiating",
  "deal",
] as const;

/**
 * Statuses selectable inside Customer Details — active operational stages.
 */
export const DETAIL_STATUS_OPTIONS = [
  "new",
  "contacted",
  "inspection_scheduled",
  "no_show",
  "inspected",
  "negotiating",
  "deal",
] as const;

/**
 * What each status actually means. Shown on hover in the status dropdown.
 */
export const STATUS_HINT: Record<string, string> = {
  new: "New data coming from the valuation form.",
  contacted: "You have reached out to the customer.",
  inspection_scheduled: "A viewing is booked but has not happened yet.",
  no_show: "The customer did not attend the scheduled inspection.",
  inspected: "You met the customer and saw the car in person.",
  negotiating: "You have seen the car and are still agreeing a price.",
  deal: "The customer agreed to sell — you bought the car.",
};

/** Statuses offered in the Leads Directory filter. */
export const FILTER_STATUS_OPTIONS = [
  "new",
  "contacted",
  "inspection_scheduled",
  "no_show",
  "inspected",
  "negotiating",
  "deal",
] as const;

/**
 * The purchase price is asked for at "Deal" and nowhere else — that is the
 * moment the car was actually bought, and it is the figure the developer's
 * share is later calculated against. Every earlier status is a stage in a
 * conversation where no money has changed hands, so there is nothing truthful
 * to record yet.
 *
 * This replaced the old Estimated Value prompt, which asked for a guess on
 * every status. The column still exists on `leads` and historical figures are
 * intact — it is simply no longer shown or collected.
 */
export function requiresPurchasePrice(status: string): boolean {
  return status === "deal";
}

/** e.g. "Tue, 09 Sep 2026, 14:30" — day of week included because a bare date is easy to mis-read. */
export function formatScheduledInspection(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
