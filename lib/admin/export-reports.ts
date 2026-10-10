import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Lead } from "@/config/mock-data";
import type { InventoryItem } from "@/lib/admin/inventory";
import { formatMileage } from "@/lib/format";

type ExportRow = Record<string, string | number>;

export function formatExportDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function exportExcel(title: string, rows: ExportRow[], filename: string) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const cells = (values: Array<string | number>) => values.map((value) => `<Cell><Data ss:Type="String">${xmlEscape(String(value ?? ""))}</Data></Cell>`).join("");
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlEscape(title)}"><Table><Row>${cells(headers)}</Row>${rows.map((row) => `<Row>${cells(headers.map((header) => row[header] ?? ""))}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  download(new Blob([xml], { type: "application/vnd.ms-excel" }), filename);
}

async function exportPdf(title: string, rows: ExportRow[], filename: string) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const columnWidth = headers.length ? (pageWidth - margin * 2) / headers.length : pageWidth - margin * 2;
  const fontSize = headers.length > 10 ? 5.5 : 7;
  const rowHeight = 16;
  const cellPadding = 6;
  const fitText = (value: string, maxWidth: number, size: number, textFont: typeof font) => {
    if (textFont.widthOfTextAtSize(value, size) <= maxWidth) return value;
    let result = value;
    while (result.length > 1 && textFont.widthOfTextAtSize(`${result}…`, size) > maxWidth) result = result.slice(0, -1);
    return `${result}…`;
  };
  let page = document.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const drawCell = (value: string | number, index: number, isHeader = false) => {
    const text = String(value ?? "").replace(/[\r\n]+/g, " ");
    const textFont = isHeader ? bold : font;
    const fitted = fitText(text, columnWidth - cellPadding, fontSize, textFont);
    page.drawText(fitted, {
      x: margin + index * columnWidth + 3,
      y: y - rowHeight + 4,
      size: fontSize,
      font: textFont,
      color: rgb(0.08, 0.08, 0.1),
    });
  };
  const drawRow = (values: Array<string | number>, isHeader = false) => {
    if (y < margin + rowHeight) {
      page = document.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawRectangle({ x: margin, y: y - rowHeight, width: pageWidth - margin * 2, height: rowHeight, color: isHeader ? rgb(0.9, 0.9, 0.9) : rgb(1, 1, 1), borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.35 });
    values.forEach((value, index) => drawCell(value, index, isHeader));
    y -= rowHeight;
  };
  page.drawText(title, { x: margin, y: y - 4, size: 14, font: bold, color: rgb(0.05, 0.05, 0.07) });
  y -= 24;
  drawRow(headers, true);
  rows.forEach((row) => drawRow(headers.map((header) => row[header] ?? "")));
  const bytes = await document.save();
  download(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), filename);
}

export function leadExportRows(leads: Lead[]): ExportRow[] {
  const sourceLabels: Record<string, string> = {
    web: "Website form",
    recovered: "Recovered form",
    manual_walk_in: "Walk-in",
    manual_phone_call: "Phone call",
    manual_whatsapp: "WhatsApp / message",
    manual_other: "Other",
  };
  return leads.map((lead) => ({
    "Client Name": lead.fullName ?? "",
    Mobile: lead.phoneE164 ?? "",
    Make: lead.make,
    Model: lead.model,
    Trim: lead.trim,
    Year: lead.year,
    Mileage: formatMileage(lead.mileageValue ?? lead.mileageKm, lead.mileageUnit),
    Specification: lead.specification ?? "",
    Description: lead.description,
    "Lead Source": sourceLabels[lead.source ?? "web"] ?? "Other",
    Status: lead.status,
    "Estimated Value (AED)": lead.estimatedValueAed ?? "",
    Date: formatExportDate(lead.createdAt),
    "Arrival Status": lead.arrivalStatus === "arrived" ? "Arrived" : "Not yet arrived",
  }));
}

export function inventoryExportRows(items: InventoryItem[]): ExportRow[] {
  return items.map((item) => ({
    Car: `${item.year} ${item.make} ${item.model}`,
    "Chassis / VIN Number": item.chassisNumber,
    Trim: item.trim,
    Year: item.year,
    "Sold date": formatExportDate(item.purchasedAt),
    Paid: item.purchasePriceAed,
    "Paid amount": item.salePriceAed ?? "",
    Profit: item.commission?.profitAed ?? "",
    Status: item.status,
  }));
}

export const exportLeadsPdf = (leads: Lead[]) => exportPdf("CarVibeDubai Leads", leadExportRows(leads), "carvibedubai-leads.pdf");
export const exportInventoryPdf = (items: InventoryItem[]) => exportPdf("CarVibeDubai Inventory", inventoryExportRows(items), "carvibedubai-inventory.pdf");
