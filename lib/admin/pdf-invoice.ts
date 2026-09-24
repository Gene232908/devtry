/**
 * PDF Invoice Generator for CarVibe Dubai Staff Commissions.
 * Outputs a valid PDF 1.4 vector document downloaded as "carvibedubai.pdf".
 */

export type StaffCommissionEntryForPdf = {
  id: string;
  kind: "role_commission" | "referral_incentive";
  leadName: string;
  carDetails: string;
  soldAt: string;
  profit: number | null;
  commission: number;
};

export type StaffCommissionForPdf = {
  displayName: string;
  role: "admin" | "manager" | "call_center" | "purchaser";
  totalCarsSold: number;
  totalProfit: number;
  totalCommission: number;
  isPaidThisMonth: boolean;
  entries: StaffCommissionEntryForPdf[];
};

export function downloadStaffInvoicePdf(staff: StaffCommissionForPdf) {
  const roleTitle = staff.role === "call_center" ? "Call Center Agent" : staff.role === "purchaser" ? "Purchaser" : staff.role === "admin" ? "Super Admin" : "Owner";
  const rateLabel = staff.role === "call_center" ? "2%" : staff.role === "purchaser" ? "10%" : "Role-based and referral incentive";
  const hidesProfit = staff.role === "call_center";
  const roleEntries = staff.entries.filter((entry) => entry.kind === "role_commission");
  const referralEntries = staff.entries.filter((entry) => entry.kind === "referral_incentive");
  const referralTotal = referralEntries.reduce((total, entry) => total + entry.commission, 0);
  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const esc = (str: string) =>
    (str || "").replace(/[()\\]/g, "\\$&").replace(/[^\x00-\x7F]/g, " ");

  const formatAedNum = (num: number) =>
    "AED " + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatTableAed = (num: number) => "AED " + num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const fitText = (value: string, maxLength: number) => value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  const formatClosedDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? fitText(value, 10)
      : date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // PDF page setup (A4: 595.28 x 841.89)
  const headerAccent = "0.83 0.68 0.21 rg\n40 795 515 15 re\nf\n0 0 0 rg\n";
  const titleBlock =
    "BT\n/F2 20 Tf\n40 760 Td\n(CARVIBE DUBAI) Tj\nET\n" +
    "BT\n/F2 13 Tf\n40 740 Td\n(COMMISSION INVOICE STATEMENT) Tj\nET\n" +
    "0.8 0.8 0.8 RG\n1 w\n40 728 m\n555 728 l\nS\n0 0 0 rg\n";

  const referralBlock = referralEntries.length > 0
    ? `BT\n/F2 9 Tf\n330 688 Td\n(Referral Incentive:) Tj\nET\n` +
      `BT\n/F2 9 Tf\n460 688 Td\n(${esc(formatAedNum(referralTotal))}) Tj\nET\n` +
      `BT\n/F2 9 Tf\n330 671 Td\n(Customers Referred:) Tj\nET\n` +
      `BT\n/F2 9 Tf\n460 671 Td\n(${referralEntries.length}) Tj\nET\n`
    : "";
  const paymentStatusY = referralEntries.length > 0 ? 654 : 688;
  const staffBlock =
    `BT\n/F2 10 Tf\n40 705 Td\n(Staff Name:) Tj\nET\n` +
    `BT\n/F1 10 Tf\n130 705 Td\n(${esc(staff.displayName)}) Tj\nET\n` +
    `BT\n/F2 10 Tf\n40 688 Td\n(Role / Position:) Tj\nET\n` +
    `BT\n/F1 10 Tf\n130 688 Td\n(${esc(roleTitle)}) Tj\nET\n` +
    `BT\n/F2 10 Tf\n40 671 Td\n(Commission Rate:) Tj\nET\n` +
    `BT\n/F1 10 Tf\n130 671 Td\n(${rateLabel}) Tj\nET\n` +
    `BT\n/F2 10 Tf\n330 705 Td\n(Invoice Date:) Tj\nET\n` +
    `BT\n/F1 10 Tf\n460 705 Td\n(${esc(now)}) Tj\nET\n` +
    referralBlock +
    `BT\n/F2 9 Tf\n330 ${paymentStatusY} Td\n(Payment Status:) Tj\nET\n` +
    `BT\n/F2 10 Tf\n440 ${paymentStatusY} Td\n(${staff.isPaidThisMonth ? "PAID" : "UNPAID / OUTSTANDING"}) Tj\nET\n`;

  const summaryBox = hidesProfit
    ? "0.96 0.96 0.96 rg\n40 610 515 42 re\nf\n0.8 0.8 0.8 RG\n40 610 515 42 re\nS\n0 0 0 rg\n" +
      `BT\n/F2 10 Tf\n55 627 Td\n(Cars Closed: ${staff.totalCarsSold}) Tj\nET\n` +
      `BT\n/F2 10 Tf\n340 627 Td\n(Total Commission: ${esc(formatAedNum(staff.totalCommission))}) Tj\nET\n`
    :
    "0.96 0.96 0.96 rg\n40 610 515 42 re\nf\n0.8 0.8 0.8 RG\n40 610 515 42 re\nS\n0 0 0 rg\n" +
    `BT\n/F2 10 Tf\n55 627 Td\n(Cars Closed: ${staff.totalCarsSold}) Tj\nET\n` +
    `BT\n/F2 10 Tf\n185 627 Td\n(Total Profit: ${esc(formatAedNum(staff.totalProfit))}) Tj\nET\n` +
    `BT\n/F2 10 Tf\n370 627 Td\n(Total Commission: ${esc(formatAedNum(staff.totalCommission))}) Tj\nET\n`;

  const tableHeader = hidesProfit
    ? "0.12 0.12 0.12 rg\n40 575 515 22 re\nf\n1 1 1 rg\n" +
      `BT\n/F2 8 Tf\n48 582 Td\n(CUSTOMER) Tj\nET\n` +
      `BT\n/F2 8 Tf\n180 582 Td\n(CAR DETAILS) Tj\nET\n` +
      `BT\n/F2 8 Tf\n350 582 Td\n(DATE CLOSED) Tj\nET\n` +
      `BT\n/F2 8 Tf\n455 582 Td\n(COMMISSION) Tj\nET\n` +
      "0 0 0 rg\n"
    :
    "0.12 0.12 0.12 rg\n40 575 515 22 re\nf\n1 1 1 rg\n" +
    `BT\n/F2 8 Tf\n48 582 Td\n(CUSTOMER) Tj\nET\n` +
    `BT\n/F2 8 Tf\n150 582 Td\n(CAR DETAILS) Tj\nET\n` +
    `BT\n/F2 8 Tf\n290 582 Td\n(DATE CLOSED) Tj\nET\n` +
    `BT\n/F2 8 Tf\n370 582 Td\n(PROFIT) Tj\nET\n` +
    `BT\n/F2 8 Tf\n458 582 Td\n(COMMISSION) Tj\nET\n` +
    "0 0 0 rg\n";

  let tableRows = "";
  let currentY = 550;

  roleEntries.forEach((e) => {
    tableRows += `0.9 0.9 0.9 RG\n1 w\n40 ${currentY} m\n555 ${currentY} l\nS\n0 0 0 rg\n`;
    const yText = currentY + 6;
    tableRows += hidesProfit
      ? `BT\n/F1 8 Tf\n48 ${yText} Td\n(${esc(fitText(e.leadName, 20))}) Tj\nET\n` +
        `BT\n/F1 8 Tf\n180 ${yText} Td\n(${esc(fitText(e.carDetails, 28))}) Tj\nET\n` +
        `BT\n/F1 8 Tf\n350 ${yText} Td\n(${esc(formatClosedDate(e.soldAt))}) Tj\nET\n` +
        `BT\n/F2 8 Tf\n455 ${yText} Td\n(${esc(formatTableAed(e.commission))}) Tj\nET\n`
      : `BT\n/F1 8 Tf\n48 ${yText} Td\n(${esc(fitText(e.leadName, 18))}) Tj\nET\n` +
        `BT\n/F1 8 Tf\n150 ${yText} Td\n(${esc(fitText(e.carDetails, 24))}) Tj\nET\n` +
        `BT\n/F1 8 Tf\n290 ${yText} Td\n(${esc(formatClosedDate(e.soldAt))}) Tj\nET\n` +
        `BT\n/F1 8 Tf\n370 ${yText} Td\n(${esc(formatTableAed(e.profit ?? 0))}) Tj\nET\n` +
        `BT\n/F2 8 Tf\n458 ${yText} Td\n(${esc(formatTableAed(e.commission))}) Tj\nET\n`;
    currentY -= 24;
  });

  if (roleEntries.length === 0) {
    tableRows +=
      `0.9 0.9 0.9 RG\n1 w\n40 ${currentY} m\n555 ${currentY} l\nS\n0 0 0 rg\n` +
      `BT\n/F1 9 Tf\n48 ${currentY + 6} Td\n(No role commission sales recorded for this period.) Tj\nET\n`;
    currentY -= 24;
  }

  currentY -= 10;
  const totalBar =
    `0.83 0.68 0.21 rg\n40 ${currentY - 5} 515 26 re\nf\n0 0 0 rg\n` +
    `BT\n/F2 10 Tf\n48 ${currentY + 3} Td\n(TOTAL COMMISSION PAYABLE) Tj\nET\n` +
    `BT\n/F2 11 Tf\n465 ${currentY + 3} Td\n(${esc(formatAedNum(staff.totalCommission))}) Tj\nET\n`;

  const footer =
    "0.4 0.4 0.4 rg\n" +
    `BT\n/F1 8 Tf\n40 40 Td\n(CarVibe Dubai - Official Staff Commission Statement | www.carvibedubai.com) Tj\nET\n`;

  const contentStream =
    headerAccent + titleBlock + staffBlock + summaryBox + tableHeader + tableRows + totalBar + footer;

  const pdfObjects = [
    `%PDF-1.4\n`,
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /MediaBox [0 0 595.28 841.89] /Contents 6 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
    `6 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let offset = pdfObjects[0].length;
  const offsets: number[] = [];
  for (let i = 1; i < pdfObjects.length; i++) {
    offsets.push(offset);
    offset += pdfObjects[i].length;
  }

  let xref = `xref\n0 ${pdfObjects.length}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    xref += String(off).padStart(10, "0") + " 00000 n \n";
  });

  const startxref = offset;
  const trailer = `trailer\n<< /Size ${pdfObjects.length} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  const fullPdf = pdfObjects.join("") + xref + trailer;

  const blob = new Blob([fullPdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "carvibedubai.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
