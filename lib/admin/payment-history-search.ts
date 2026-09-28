import { formatUaeDateTime } from "@/lib/uae-time";
import type { StaffCommissionPayment } from "@/lib/admin/commission";

export function paymentReceiptId(paymentId: string): string {
  return paymentId.slice(0, 8).toUpperCase();
}

export function paymentMatchesSearch(payment: StaffCommissionPayment, search: string): boolean {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return true;

  return [
    paymentReceiptId(payment.id),
    payment.id,
    formatUaeDateTime(payment.paidAt),
    payment.paidAt,
    payment.paidByName,
    String(payment.totalAmount),
    payment.totalAmount.toLocaleString("en-AE"),
    ...payment.entries.flatMap((entry) => [entry.leadName, entry.carDetails, String(entry.commission)]),
  ].some((value) => value.toLocaleLowerCase().includes(query));
}
