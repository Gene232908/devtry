import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadStaffPaymentReceiptPdf } from "./pdf-invoice";

const originalDocument = globalThis.document;
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

afterEach(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  URL.createObjectURL = originalCreateObjectUrl;
  URL.revokeObjectURL = originalRevokeObjectUrl;
});

describe("staff payment receipt PDF", () => {
  it("downloads a frozen receipt with payment date, confirmer, sales, and total", async () => {
    let capturedBlob: Blob | null = null;
    const click = vi.fn();
    const removeChild = vi.fn();
    const appendChild = vi.fn();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: vi.fn(() => ({ href: "", download: "", click })),
        body: { appendChild, removeChild },
      },
    });
    URL.createObjectURL = vi.fn((blob: Blob) => { capturedBlob = blob; return "blob:payment"; });
    URL.revokeObjectURL = vi.fn();

    downloadStaffPaymentReceiptPdf(
      { displayName: "Agent One", role: "call_center" },
      {
        id: "12345678-1234-4234-9234-123456789012",
        totalAmount: 94,
        entryCount: 1,
        paidAt: "2026-09-27T11:00:00.000Z",
        paidByName: "Developer Test",
        entries: [{
          id: "entry-1", kind: "role_commission", leadName: "John Carner", carDetails: "2026 Rolls-Royce Ghost",
          soldAt: "2026-09-27T11:00:00.000Z", profit: 4700, commission: 94,
        }],
      },
    );

    expect(capturedBlob).not.toBeNull();
    const text = await capturedBlob!.text();
    expect(text).toContain("STAFF PAYMENT RECEIPT");
    expect(text).toContain("310 705 Td");
    expect(text).toContain("410 705 Td");
    expect(text).toContain("310 688 Td");
    expect(text).toContain("410 688 Td");
    expect(text).toContain("310 671 Td");
    expect(text).toContain("410 671 Td");
    expect(text).toContain("Developer Test");
    expect(text).toContain("John Carner");
    expect(text).toContain("TOTAL PAID");
    expect(text).toContain("(Payment Status:) Tj");
    expect(text).not.toContain("Payment Status: AED");
    expect(text).toContain("94.00");
    expect(click).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledOnce();
  });
});
