import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatUaeDateTime } from "@/lib/uae-time";
import type { StaffIdentity } from "@/lib/auth/permissions";

export type CompanyExpenseItem = {
  id: string;
  inventoryId: string;
  leadId: string | null;
  description: string;
  amountAed: number;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
  createdByRole: string | null;
  vehicle: {
    make: string;
    model: string;
    year: number;
    trim: string | null;
    chassisNumber: string | null;
    status: string;
    inquiryType: "valuation" | "scrap" | "unknown";
    purchasePriceAed: number;
    salePriceAed: number | null;
  };
  customerName?: string | null;
};

export type ExpensesSummary = {
  totalExpensesAed: number;
  totalCount: number;
  thisMonthExpensesAed: number;
  thisMonthCount: number;
  thisMonthLabel: string;
  uniqueVehiclesCount: number;
  averagePerVehicleAed: number;
  valuationExpensesAed: number;
  scrapExpensesAed: number;
};

export const demoExpenses: CompanyExpenseItem[] = [
  {
    id: "exp-demo-01",
    inventoryId: "INV-0005",
    leadId: "L-400868",
    description: "Flatbed enclosed recovery from Emirates Hills VIP Residence",
    amountAed: 650,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    createdById: "demo-purchaser-id",
    createdByName: "Purchaser Team",
    createdByRole: "purchaser",
    vehicle: {
      make: "Rolls-Royce",
      model: "Phantom",
      year: 2023,
      trim: "Extended Wheelbase",
      chassisNumber: "DEMO-RR-2023-0005",
      status: "in_stock",
      inquiryType: "valuation",
      purchasePriceAed: 2000000,
      salePriceAed: null,
    },
    customerName: "Sheikh Al-Maktoum",
  },
  {
    id: "exp-demo-02",
    inventoryId: "INV-0003",
    leadId: "L-400872",
    description: "RTA Comprehensive Vehicle Inspection & Passing Certificate",
    amountAed: 170,
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    createdById: "demo-purchaser-id",
    createdByName: "Purchaser Team",
    createdByRole: "purchaser",
    vehicle: {
      make: "Nissan",
      model: "Patrol",
      year: 2022,
      trim: "LE Platinum",
      chassisNumber: "DEMO-NP-2022-0003",
      status: "sold",
      inquiryType: "valuation",
      purchasePriceAed: 170000,
      salePriceAed: 185000,
    },
    customerName: "Ahmed Al-Mansoor",
  },
  {
    id: "exp-demo-03",
    inventoryId: "INV-0003",
    leadId: "L-400872",
    description: "Full interior steam sanitization, leather conditioning, and exterior 3-step polish",
    amountAed: 350,
    createdAt: new Date(Date.now() - 3600000 * 100).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 100).toISOString(),
    createdById: "demo-superadmin-id",
    createdByName: "Sir Nyash",
    createdByRole: "admin",
    vehicle: {
      make: "Nissan",
      model: "Patrol",
      year: 2022,
      trim: "LE Platinum",
      chassisNumber: "DEMO-NP-2022-0003",
      status: "sold",
      inquiryType: "valuation",
      purchasePriceAed: 170000,
      salePriceAed: 185000,
    },
    customerName: "Ahmed Al-Mansoor",
  },
  {
    id: "exp-demo-04",
    inventoryId: "INV-0002",
    leadId: "L-400865",
    description: "Heavy winch recovery & transport from Sharjah Industrial Area scrap yard",
    amountAed: 450,
    createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 200).toISOString(),
    createdById: "demo-purchaser-id",
    createdByName: "Purchaser Team",
    createdByRole: "purchaser",
    vehicle: {
      make: "Toyota",
      model: "Land Cruiser",
      year: 2021,
      trim: "VXR",
      chassisNumber: "DEMO-TLC-2021-0002",
      status: "sold",
      inquiryType: "scrap",
      purchasePriceAed: 155000,
      salePriceAed: 172500,
    },
    customerName: "Tariq Mahmood",
  },
  {
    id: "exp-demo-05",
    inventoryId: "INV-0004",
    leadId: "L-400867",
    description: "New 12V 90Ah AGM starter battery replacement & electrical diagnostic check",
    amountAed: 580,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    createdById: "demo-purchaser-id",
    createdByName: "Purchaser Team",
    createdByRole: "purchaser",
    vehicle: {
      make: "Nissan",
      model: "Patrol",
      year: 2019,
      trim: "XE",
      chassisNumber: "DEMO-NP-2019-0004",
      status: "reserved",
      inquiryType: "valuation",
      purchasePriceAed: 88000,
      salePriceAed: null,
    },
    customerName: "Khalid Bin Sultan",
  },
  {
    id: "exp-demo-06",
    inventoryId: "INV-0001",
    leadId: "L-400866",
    description: "RTA Passing test & vehicle title deregistraion fee at Tasjeel Al Barsha",
    amountAed: 220,
    createdAt: new Date(Date.now() - 3600000 * 280).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 280).toISOString(),
    createdById: "demo-superadmin-id",
    createdByName: "Sir Nyash",
    createdByRole: "admin",
    vehicle: {
      make: "Porsche",
      model: "Cayenne",
      year: 2020,
      trim: "S",
      chassisNumber: "DEMO-PC-2020-0001",
      status: "sold",
      inquiryType: "valuation",
      purchasePriceAed: 210000,
      salePriceAed: 232000,
    },
    customerName: "Elena Rostova",
  },
];

export function calculateExpensesSummary(items: CompanyExpenseItem[]): ExpensesSummary {
  const totalExpensesAed = items.reduce((acc, item) => acc + item.amountAed, 0);
  const uniqueVehicles = new Set(items.map((item) => item.inventoryId));
  const uniqueVehiclesCount = uniqueVehicles.size;

  const now = new Date();
  const nowUae = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const currentYear = nowUae.getUTCFullYear();
  const currentMonth = nowUae.getUTCMonth();
  const thisMonthLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    month: "long",
    year: "numeric",
  }).format(now);

  const thisMonthItems = items.filter((item) => {
    const itemDate = new Date(item.createdAt);
    if (Number.isNaN(itemDate.getTime())) return false;
    const itemUae = new Date(itemDate.getTime() + 4 * 60 * 60 * 1000);
    return itemUae.getUTCFullYear() === currentYear && itemUae.getUTCMonth() === currentMonth;
  });

  const thisMonthExpensesAed = thisMonthItems.reduce((acc, item) => acc + item.amountAed, 0);

  const valuationExpensesAed = items
    .filter((item) => item.vehicle.inquiryType === "valuation")
    .reduce((acc, item) => acc + item.amountAed, 0);
  const scrapExpensesAed = items
    .filter((item) => item.vehicle.inquiryType === "scrap")
    .reduce((acc, item) => acc + item.amountAed, 0);

  return {
    totalExpensesAed: Math.round(totalExpensesAed * 100) / 100,
    totalCount: items.length,
    thisMonthExpensesAed: Math.round(thisMonthExpensesAed * 100) / 100,
    thisMonthCount: thisMonthItems.length,
    thisMonthLabel,
    uniqueVehiclesCount,
    averagePerVehicleAed: uniqueVehiclesCount > 0 ? Math.round((totalExpensesAed / uniqueVehiclesCount) * 100) / 100 : 0,
    valuationExpensesAed: Math.round(valuationExpensesAed * 100) / 100,
    scrapExpensesAed: Math.round(scrapExpensesAed * 100) / 100,
  };
}

export async function fetchCompanyExpenses(identity?: Pick<StaffIdentity, "role" | "userId">): Promise<{
  ok: boolean;
  data: { items: CompanyExpenseItem[]; summary: ExpensesSummary };
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      data: {
        items: demoExpenses,
        summary: calculateExpensesSummary(demoExpenses),
      },
    };
  }

  const supabase = getSupabaseAdmin();

  // Query expenses with joined inventory, lead details, and creator profile
  const { data: rows, error: expensesError } = await supabase
    .from("inventory_expenses")
    .select(`
      id,
      inventory_id,
      description,
      amount_aed,
      created_by,
      created_at,
      updated_at,
      inventory:inventory_id (
        id,
        lead_id,
        make,
        model,
        year,
        trim,
        chassis_number,
        status,
        purchase_price_aed,
        sale_price_aed,
        leads:lead_id (
          id,
          full_name,
          inquiry_type,
          purchaser_id
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (expensesError) {
    return {
      ok: false,
      data: { items: [], summary: calculateExpensesSummary([]) },
      error: expensesError.message,
    };
  }

  type RawExpenseRow = {
    id: string;
    inventory_id: string;
    description: string;
    amount_aed: number | string;
    created_by: string;
    created_at: string;
    updated_at: string;
    inventory: {
      id: string;
      lead_id: string | null;
      make: string;
      model: string;
      year: number;
      trim: string | null;
      chassis_number: string | null;
      status: string;
      purchase_price_aed: number | string;
      sale_price_aed: number | string | null;
      leads: {
        id: string;
        full_name: string | null;
        inquiry_type: string | null;
        purchaser_id: string | null;
      } | {
        id: string;
        full_name: string | null;
        inquiry_type: string | null;
        purchaser_id: string | null;
      }[] | null;
    } | {
      id: string;
      lead_id: string | null;
      make: string;
      model: string;
      year: number;
      trim: string | null;
      chassis_number: string | null;
      status: string;
      purchase_price_aed: number | string;
      sale_price_aed: number | string | null;
      leads: {
        id: string;
        full_name: string | null;
        inquiry_type: string | null;
        purchaser_id: string | null;
      } | {
        id: string;
        full_name: string | null;
        inquiry_type: string | null;
        purchaser_id: string | null;
      }[] | null;
    }[] | null;
  };

  const rawRows = (rows ?? []) as unknown as RawExpenseRow[];

  // Fetch creator profiles
  const creatorIds = Array.from(new Set(rawRows.map((r) => r.created_by).filter(Boolean)));
  const { data: profiles } = creatorIds.length
    ? await supabase.from("profiles").select("id, display_name, role").in("id", creatorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, { name: p.display_name ?? "Staff", role: p.role }]));

  let items: CompanyExpenseItem[] = rawRows.map((row) => {
    const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
    const lead = Array.isArray(inv?.leads) ? inv.leads[0] : inv?.leads;
    const creator = profileMap.get(row.created_by);

    const inquiryTypeRaw = lead?.inquiry_type?.toLowerCase();
    const inquiryType = inquiryTypeRaw === "scrap" ? "scrap" : inquiryTypeRaw === "valuation" ? "valuation" : "unknown";

    return {
      id: row.id,
      inventoryId: row.inventory_id,
      leadId: inv?.lead_id ?? null,
      description: row.description,
      amountAed: Number(row.amount_aed) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdById: row.created_by,
      createdByName: creator?.name ?? "Staff member",
      createdByRole: creator?.role ?? null,
      vehicle: {
        make: inv?.make ?? "Unknown",
        model: inv?.model ?? "Vehicle",
        year: inv?.year ?? new Date().getFullYear(),
        trim: inv?.trim ?? null,
        chassisNumber: inv?.chassis_number ?? null,
        status: inv?.status ?? "in_stock",
        inquiryType,
        purchasePriceAed: Number(inv?.purchase_price_aed) || 0,
        salePriceAed: inv?.sale_price_aed ? Number(inv.sale_price_aed) : null,
      },
      customerName: lead?.full_name ?? null,
    };
  });

  // If purchaser role, scope to their assigned deals
  if (identity?.role === "purchaser") {
    items = items.filter((item) => {
      const inv = rawRows.find((r) => r.id === item.id)?.inventory;
      const singleInv = Array.isArray(inv) ? inv[0] : inv;
      const lead = Array.isArray(singleInv?.leads) ? singleInv.leads[0] : singleInv?.leads;
      return lead?.purchaser_id === identity.userId || item.createdById === identity.userId;
    });
  }

  // Fallback to demo items if no DB expenses exist yet
  if (items.length === 0) {
    items = demoExpenses;
  }

  return {
    ok: true,
    data: {
      items,
      summary: calculateExpensesSummary(items),
    },
  };
}

export function formatExpenseCsv(items: CompanyExpenseItem[]): string {
  const headers = [
    "Expense ID",
    "Date (UAE)",
    "Vehicle",
    "Chassis Number",
    "Inquiry Type",
    "Description",
    "Amount (AED)",
    "Logged By",
    "Staff Role",
    "Vehicle Status",
    "Customer Name",
  ];

  const escapeCsv = (str: string | number | null | undefined) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map((item) => [
    escapeCsv(item.id),
    escapeCsv(formatUaeDateTime(item.createdAt)),
    escapeCsv(`${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}${item.vehicle.trim ? ` ${item.vehicle.trim}` : ""}`),
    escapeCsv(item.vehicle.chassisNumber ?? "N/A"),
    escapeCsv(item.vehicle.inquiryType.toUpperCase()),
    escapeCsv(item.description),
    escapeCsv(item.amountAed.toFixed(2)),
    escapeCsv(item.createdByName),
    escapeCsv(item.createdByRole ?? "N/A"),
    escapeCsv(item.vehicle.status),
    escapeCsv(item.customerName ?? "N/A"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

export type ExpensePeriodFilter = "day" | "weekly" | "monthly" | "yearly" | "all";

export function filterExpensesByPeriod(
  items: CompanyExpenseItem[],
  period: ExpensePeriodFilter,
  referenceDate: Date = new Date()
): CompanyExpenseItem[] {
  if (period === "all") return items;

  const refUae = new Date(referenceDate.getTime() + 4 * 60 * 60 * 1000);
  const refYear = refUae.getUTCFullYear();
  const refMonth = refUae.getUTCMonth();
  const refDate = refUae.getUTCDate();
  const refDayOfWeek = refUae.getUTCDay(); // 0 is Sunday

  // Start of week in UAE (Sunday 00:00:00)
  const startOfWeekUae = new Date(refUae);
  startOfWeekUae.setUTCDate(refDate - refDayOfWeek);
  startOfWeekUae.setUTCHours(0, 0, 0, 0);

  return items.filter((item) => {
    const d = new Date(item.createdAt);
    if (isNaN(d.getTime())) return false;
    const itemUae = new Date(d.getTime() + 4 * 60 * 60 * 1000);

    const itemYear = itemUae.getUTCFullYear();
    const itemMonth = itemUae.getUTCMonth();
    const itemDate = itemUae.getUTCDate();

    if (period === "yearly") {
      return itemYear === refYear;
    }
    if (period === "monthly") {
      return itemYear === refYear && itemMonth === refMonth;
    }
    if (period === "day") {
      return itemYear === refYear && itemMonth === refMonth && itemDate === refDate;
    }
    if (period === "weekly") {
      return itemUae.getTime() >= startOfWeekUae.getTime() && itemYear === refYear;
    }
    return true;
  });
}

export async function generateExpensesPdfBlob(
  items: CompanyExpenseItem[],
  options?: {
    periodLabel?: string;
    totalAed?: number;
  }
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4 (841.89 x 595.28 pt)
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 769.89 pt

  // Columns definition (Total = 770 pt)
  const columns = [
    { header: "Date & Time (UAE)", width: 105, align: "left" as const },
    { header: "Vehicle Details", width: 215, align: "left" as const },
    { header: "Origin", width: 65, align: "center" as const },
    { header: "Description", width: 195, align: "left" as const },
    { header: "Logged By", width: 115, align: "left" as const },
    { header: "Amount (AED)", width: 75, align: "right" as const },
  ];

  const rowHeight = 22;
  const headerHeight = 24;
  const totalRowHeight = 26;

  const totalAed = options?.totalAed ?? items.reduce((acc, it) => acc + it.amountAed, 0);
  const scopeLabel = options?.periodLabel ?? "All Records";

  const fitText = (text: string, maxWidth: number, size: number, textFont: typeof font) => {
    const clean = (text || "").replace(/[\r\n\t]+/g, " ").trim();
    if (textFont.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
    let res = clean;
    while (res.length > 1 && textFont.widthOfTextAtSize(`${res}…`, size) > maxWidth) {
      res = res.slice(0, -1);
    }
    return `${res}…`;
  };

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeaderBanner = () => {
    // Top Gold Accent Bar
    page.drawRectangle({
      x: margin,
      y: y - 3,
      width: contentWidth,
      height: 3,
      color: rgb(0.831, 0.686, 0.216), // #D4AF37 Gold
    });
    y -= 16;

    // Header Title (Clean, Minimal, Executive)
    page.drawText("CARVIBE DUBAI", {
      x: margin,
      y,
      size: 15,
      font: bold,
      color: rgb(0.831, 0.686, 0.216),
    });

    const reportScope = `VEHICLE EXPENSES REPORT • ${scopeLabel.toUpperCase()}`;
    page.drawText(reportScope, {
      x: margin + contentWidth - bold.widthOfTextAtSize(reportScope, 9.5),
      y: y + 2,
      size: 9.5,
      font: bold,
      color: rgb(0.25, 0.25, 0.3),
    });

    y -= 14;
    // Divider line
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + contentWidth, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });
    y -= 12;
  };

  const drawTableHeader = () => {
    // Header background
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(0.08, 0.08, 0.09), // #141416 Obsidian
    });

    let currentX = margin;
    columns.forEach((col) => {
      const text = col.header.toUpperCase();
      const fontSize = 8.5;
      let textX = currentX + 8;
      if (col.align === "right") {
        textX = currentX + col.width - bold.widthOfTextAtSize(text, fontSize) - 8;
      } else if (col.align === "center") {
        textX = currentX + (col.width - bold.widthOfTextAtSize(text, fontSize)) / 2;
      }

      page.drawText(text, {
        x: textX,
        y: y - headerHeight + 8,
        size: fontSize,
        font: bold,
        color: rgb(1, 1, 1),
      });

      currentX += col.width;
    });

    y -= headerHeight;
  };

  // Draw initial header and table header
  drawHeaderBanner();
  drawTableHeader();

  // Draw data rows
  items.forEach((item, index) => {
    // Check if row fits on page (reserve space for footer + total if last item)
    const requiredSpace = (index === items.length - 1 ? totalRowHeight : 0) + rowHeight + margin + 15;
    if (y < requiredSpace) {
      // Add page
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawTableHeader();
    }

    const isEven = index % 2 === 0;
    const rowBg = isEven ? rgb(0.975, 0.975, 0.985) : rgb(1, 1, 1);

    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rowBg,
      borderColor: rgb(0.88, 0.88, 0.91),
      borderWidth: 0.35,
    });

    const carName = `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}${item.vehicle.trim ? ` ${item.vehicle.trim}` : ""}`;
    const staffLabel = `${item.createdByName}${item.createdByRole ? ` (${item.createdByRole.toUpperCase()})` : ""}`;
    const originLabel = item.vehicle.inquiryType === "scrap" ? "Scrap" : "Valuation";

    const values = [
      formatUaeDateTime(item.createdAt),
      carName,
      originLabel,
      item.description,
      staffLabel,
      item.amountAed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ];

    let currentX = margin;
    columns.forEach((col, cIdx) => {
      const val = values[cIdx];
      const fontSize = 8.5;
      const textFont = cIdx === 5 ? bold : font;
      const fitted = fitText(val, col.width - 16, fontSize, textFont);

      let textX = currentX + 8;
      if (col.align === "right") {
        textX = currentX + col.width - textFont.widthOfTextAtSize(fitted, fontSize) - 8;
      } else if (col.align === "center") {
        textX = currentX + (col.width - textFont.widthOfTextAtSize(fitted, fontSize)) / 2;
      }

      page.drawText(fitted, {
        x: textX,
        y: y - rowHeight + 7,
        size: fontSize,
        font: textFont,
        color: cIdx === 5 ? rgb(0.05, 0.05, 0.08) : rgb(0.15, 0.15, 0.18),
      });

      currentX += col.width;
    });

    y -= rowHeight;
  });

  // Total Summary Row
  if (items.length > 0) {
    page.drawRectangle({
      x: margin,
      y: y - totalRowHeight,
      width: contentWidth,
      height: totalRowHeight,
      color: rgb(0.08, 0.08, 0.09),
      borderColor: rgb(0.831, 0.686, 0.216),
      borderWidth: 1,
    });

    const recordCountText = `${items.length} ${items.length === 1 ? "RECORD" : "RECORDS"}`;
    const totalSummaryLabel = `TOTAL OPERATIONAL EXPENSES (${recordCountText})`;
    page.drawText(totalSummaryLabel, {
      x: margin + 10,
      y: y - totalRowHeight + 8,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
    });

    const totalAmtText = `${totalAed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
    const totalAmtWidth = bold.widthOfTextAtSize(totalAmtText, 10.5);
    page.drawText(totalAmtText, {
      x: margin + contentWidth - totalAmtWidth - 10,
      y: y - totalRowHeight + 7.5,
      size: 10.5,
      font: bold,
      color: rgb(0.831, 0.686, 0.216),
    });

    y -= totalRowHeight;
  }

  // Draw Page Numbers and Footers on all pages
  const totalPages = doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = doc.getPage(i);
    const footerText = `CarVibe Dubai • Confidential Operational Report • Page ${i + 1} of ${totalPages}`;
    const footerWidth = font.widthOfTextAtSize(footerText, 7.5);
    p.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: 18,
      size: 7.5,
      font,
      color: rgb(0.55, 0.55, 0.6),
    });
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

export async function downloadExpensesPdf(
  items: CompanyExpenseItem[],
  options?: {
    periodLabel?: string;
    totalAed?: number;
    filename?: string;
  }
): Promise<void> {
  const blob = await generateExpensesPdfBlob(items, options);
  const today = new Date().toISOString().slice(0, 10);
  const filename = options?.filename ?? `CarVibe_Expenses_${today}.pdf`;

  if (typeof window !== "undefined") {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
