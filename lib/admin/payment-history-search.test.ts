import { describe, expect, it } from "vitest";
import { paymentMatchesSearch, paymentReceiptId } from "./payment-history-search";
import type { StaffCommissionPayment } from "./commission";

const payment: StaffCommissionPayment = {
  id: "fd3142f2-18ab-4d1d-a88c-0123456789ab",
  totalAmount: 470,
  entryCount: 1,
  paidAt: "2026-09-27T10:59:00.000Z",
  paidByName: "Developer (test)",
  entries: [{
    id: "entry-1",
    kind: "role_commission",
    leadName: "John Carner",
    carDetails: "2026 Rolls-Royce Ghost",
    soldAt: "2026-09-27T10:00:00.000Z",
    profit: 4700,
    commission: 470,
  }],
};

describe("payment history search", () => {
  it("uses the short receipt ID shown in the PDF", () => {
    expect(paymentReceiptId(payment.id)).toBe("FD3142F2");
    expect(paymentMatchesSearch(payment, "fd3142f2")).toBe(true);
  });

  it.each(["John Carner", "Ghost", "470", "Developer", "27 Sept 2026"])("matches payment details: %s", (search) => {
    expect(paymentMatchesSearch(payment, search)).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(paymentMatchesSearch(payment, "not-a-payment")).toBe(false);
  });
});
