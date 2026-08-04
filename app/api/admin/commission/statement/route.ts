import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { COMMISSION_RATE } from "@/lib/admin/inventory";
import { formatMonth } from "@/lib/admin/commission";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

/**
 * The downloadable commission statement for one quarter.
 *
 * Two formats, both from the same figures:
 *   html — a print-ready document. Opening it and pressing Ctrl/Cmd-P saves a
 *          PDF, which is why there is no PDF library here: adding a dependency
 *          to reproduce what every browser already does well would be weight
 *          for its own sake.
 *   csv  — the same rows for a spreadsheet or an accountant.
 *
 * It lists every car individually rather than only monthly totals. A statement
 * that says "AED 477.90 for Q3" is something the owner has to take on trust; one
 * that shows each car, what it cost, what it sold for and the share on it can
 * be checked line by line against his own records.
 *
 * Available whether or not the quarter has been issued or paid — a draft simply
 * says so, so the developer can see what is accruing at any point.
 */

type EntryRow = {
  sold_at: string;
  purchase_price_aed: number | string;
  sale_price_aed: number | string;
  profit_aed: number | string;
  rate: number | string;
  commission_aed: number | string;
  commission_statements: { period_month: string; status: string } | { period_month: string; status: string }[] | null;
  inventory: { make: string; model: string; trim: string | null; year: number } | { make: string; model: string; trim: string | null; year: number }[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  if (v === null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function aed(n: number): string {
  return `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Escapes a CSV field: quote it, and double any quotes inside. */
function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

/** Escapes text going into the HTML document. */
function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { message: "Database is not configured." } }, { status: 503 });
  }

  const quarter = req.nextUrl.searchParams.get("quarter"); // e.g. "2026-Q3"
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "html";

  const match = /^(\d{4})-Q([1-4])$/.exec(quarter ?? "");
  if (!match) {
    return NextResponse.json({ ok: false, error: { message: "Expected a quarter like 2026-Q3." } }, { status: 400 });
  }

  const year = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  const periodStart = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const periodEnd = startMonth + 3 > 12 ? `${year + 1}-01-01` : `${year}-${String(startMonth + 3).padStart(2, "0")}-01`;

  const { data, error } = await getSupabaseAdmin()
    .from("commission_entries")
    .select(
      `sold_at, purchase_price_aed, sale_price_aed, profit_aed, rate, commission_aed,
       commission_statements!inner ( period_month, status ),
       inventory ( make, model, trim, year )`,
    )
    // Selected by the month that BILLED them, not the sale date — a carried-forward
    // sale belongs on the statement that charges for it, or it would appear on
    // neither quarter's document.
    .gte("commission_statements.period_month", periodStart)
    .lt("commission_statements.period_month", periodEnd)
    .order("sold_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const rows = ((data ?? []) as unknown as EntryRow[]).map((r) => {
    const car = one(r.inventory);
    const stmt = one(r.commission_statements);
    return {
      soldAt: r.sold_at,
      billedMonth: stmt?.period_month ?? "",
      status: stmt?.status ?? "draft",
      car: car ? `${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}` : "Car record removed",
      purchase: Number(r.purchase_price_aed),
      sale: Number(r.sale_price_aed),
      profit: Number(r.profit_aed),
      rate: Number(r.rate),
      commission: Number(r.commission_aed),
    };
  });

  const totalProfit = rows.reduce((n, r) => n + r.profit, 0);
  const totalCommission = rows.reduce((n, r) => n + r.commission, 0);
  const allPaid = rows.length > 0 && rows.every((r) => r.status === "paid");
  const anyIssued = rows.some((r) => r.status !== "draft");
  const statusLabel = rows.length === 0 ? "No sales" : allPaid ? "Paid" : anyIssued ? "Issued — awaiting payment" : "Draft";
  const filename = `commission-statement-${quarter}`;

  if (format === "csv") {
    const header = ["Sale date", "Billed in", "Car", "Purchase price (AED)", "Sale price (AED)", "Profit (AED)", "Rate", "Developer share (AED)"];
    const body = rows.map((r) =>
      [day(r.soldAt), formatMonth(r.billedMonth), r.car, r.purchase, r.sale, r.profit, `${(r.rate * 100).toFixed(0)}%`, r.commission]
        .map(csvCell)
        .join(","),
    );
    const totals = ["", "", "TOTAL", "", "", totalProfit, "", totalCommission].map(csvCell).join(",");
    // BOM so Excel opens UTF-8 correctly instead of mangling the currency text.
    const csv = `﻿${[header.map(csvCell).join(","), ...body, totals].join("\r\n")}\r\n`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const rowsHtml =
    rows.length === 0
      ? `<tr><td colspan="7" class="empty">No cars were sold in this quarter.</td></tr>`
      : rows
          .map((r) => {
            const carried = r.billedMonth.slice(0, 7) !== r.soldAt.slice(0, 7);
            return `<tr>
      <td>${day(r.soldAt)}${carried ? `<span class="note">billed ${esc(formatMonth(r.billedMonth))}</span>` : ""}</td>
      <td>${esc(r.car)}</td>
      <td class="n">${aed(r.purchase)}</td>
      <td class="n">${aed(r.sale)}</td>
      <td class="n ${r.profit < 0 ? "neg" : ""}">${aed(r.profit)}</td>
      <td class="n">${(r.rate * 100).toFixed(0)}%</td>
      <td class="n strong">${aed(r.commission)}</td>
    </tr>`;
          })
          .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(filename)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14140f; margin: 0; padding: 40px; background: #f6f5f2; }
  .sheet { max-width: 900px; margin: 0 auto; background: #fff; padding: 48px; border-radius: 4px; box-shadow: 0 2px 18px rgba(0,0,0,.08); }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #14140f; padding-bottom: 20px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.01em; }
  .muted { color: #6b6558; }
  .right { text-align: right; }
  .badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border: 1px solid #14140f; border-radius: 999px; font-size: 12px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #6b6558; margin: 32px 0 8px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #6b6558; border-bottom: 1px solid #d9d5cc; padding: 8px 10px; font-weight: 600; }
  td { padding: 11px 10px; border-bottom: 1px solid #ece9e2; vertical-align: top; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .strong { font-weight: 700; }
  .neg { color: #b3261e; }
  .empty { text-align: center; color: #6b6558; padding: 28px; }
  .note { display: block; font-size: 11px; color: #6b6558; }
  tfoot td { border-top: 2px solid #14140f; border-bottom: none; padding-top: 14px; font-weight: 700; }
  .total { margin-top: 28px; padding: 18px 20px; background: #14140f; color: #fff; display: flex; justify-content: space-between; align-items: center; border-radius: 3px; }
  .total .amt { font-size: 22px; font-variant-numeric: tabular-nums; }
  .terms { margin-top: 28px; font-size: 12px; color: #6b6558; }
  .terms li { margin: 3px 0; }
  footer { margin-top: 36px; border-top: 1px solid #ece9e2; padding-top: 14px; font-size: 11px; color: #8a8377; }
  .print { position: fixed; top: 20px; right: 20px; padding: 10px 18px; border: 0; border-radius: 4px; background: #14140f; color: #fff; font: inherit; cursor: pointer; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; padding: 0; max-width: none; }
    .print { display: none; }
  }
</style></head>
<body>
<button class="print" onclick="window.print()">Save as PDF</button>
<div class="sheet">
  <header>
    <div>
      <h1>Commission Statement</h1>
      <div class="muted">Q${q} ${year} &middot; ${esc(formatMonth(periodStart))} to ${esc(formatMonth(periodEnd === `${year + 1}-01-01` ? `${year}-12-01` : `${year}-${String(startMonth + 2).padStart(2, "0")}-01`))}</div>
      <span class="badge">${esc(statusLabel)}</span>
    </div>
    <div class="right">
      <strong>${esc(brand.name)}</strong>
      <div class="muted">Developer commission</div>
      <div class="muted">Issued ${day(new Date().toISOString())}</div>
    </div>
  </header>

  <h2>Cars sold</h2>
  <table>
    <thead><tr>
      <th>Sale date</th><th>Car</th><th class="n">Purchase</th><th class="n">Sale</th>
      <th class="n">Profit</th><th class="n">Rate</th><th class="n">Share</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
    ${rows.length ? `<tfoot><tr><td colspan="4">Total</td><td class="n">${aed(totalProfit)}</td><td></td><td class="n">${aed(totalCommission)}</td></tr></tfoot>` : ""}
  </table>

  <div class="total">
    <span>Amount due this quarter</span>
    <span class="amt">${aed(totalCommission)}</span>
  </div>

  <div class="terms">
    <strong>How this figure is calculated</strong>
    <ul>
      <li>Profit on each car is its sale price minus its purchase price. No other costs are deducted.</li>
      <li>The developer's share is ${(COMMISSION_RATE * 100).toFixed(0)}% of that profit, calculated per car.</li>
      <li>A car sold at a loss earns no share, and that loss is not offset against other cars.</li>
      <li>Figures are frozen at the moment each sale is recorded and do not change afterwards.</li>
      <li>A sale shown as "billed" in a later month happened after its own month had been settled.</li>
    </ul>
  </div>

  <footer>Generated from the CarVibe Dubai dashboard on ${day(new Date().toISOString())}. Figures come from recorded sales and are not a tax invoice.</footer>
</div>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // inline so it opens in a tab ready to print; the CSV is the download.
      "Content-Disposition": `inline; filename="${filename}.html"`,
    },
  });
}
