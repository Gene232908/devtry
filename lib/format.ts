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
  valuation_sent: "Valuation Sent",
  closed: "Closed",
};
