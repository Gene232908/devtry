import fs from 'node:fs';
import { resolve } from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';

const root = resolve(import.meta.dirname, '..');
const outDocxPath = resolve(root, 'docs/client/Sir_Nash_Verification_Checklist.docx');
const outHtmlPath = resolve(root, 'docs/client/Sir_Nash_Verification_Checklist.html');

// Helper functions for Word Document
const p = (text = '', opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 260 },
    children: [new TextRun({ text, font: 'Segoe UI', size: 21, color: '202020', ...opts })],
  });

const bullet = (text, opts = {}) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 240 },
    children: [new TextRun({ text, font: 'Segoe UI', size: 21, color: '202020', ...opts })],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        font: 'Segoe UI Semibold',
        size: 32,
        bold: true,
        color: '0D1117',
      }),
    ],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        font: 'Segoe UI Semibold',
        size: 26,
        bold: true,
        color: 'B38E36', // gold
      }),
    ],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text,
        font: 'Segoe UI Semibold',
        size: 22,
        bold: true,
        color: '1A1F2C',
      }),
    ],
  });

const checkItem = (title, what, howSteps, see) => [
  new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({ text: '☐ ', font: 'Segoe UI Symbol', size: 24, bold: true, color: 'B38E36' }),
      new TextRun({ text: title, font: 'Segoe UI', size: 22, bold: true, color: '0D1117' }),
    ],
  }),
  new Paragraph({
    indent: { left: 360 },
    spacing: { after: 60, line: 240 },
    children: [
      new TextRun({ text: 'What it is: ', font: 'Segoe UI', size: 20, bold: true, color: '555555' }),
      new TextRun({ text: what, font: 'Segoe UI', size: 20, color: '333333' }),
    ],
  }),
  new Paragraph({
    indent: { left: 360 },
    spacing: { after: 60, line: 240 },
    children: [
      new TextRun({ text: 'How to test: ', font: 'Segoe UI', size: 20, bold: true, color: '555555' }),
      new TextRun({ text: howSteps, font: 'Segoe UI', size: 20, color: '333333' }),
    ],
  }),
  new Paragraph({
    indent: { left: 360 },
    spacing: { after: 140, line: 240 },
    children: [
      new TextRun({ text: 'What you will see: ', font: 'Segoe UI', size: 20, bold: true, color: '15803D' }),
      new TextRun({ text: see, font: 'Segoe UI', size: 20, color: '222222' }),
    ],
  }),
];

async function generate() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
          },
        },
        children: [
          // Header title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'CARVIBE DUBAI',
                font: 'Segoe UI Semibold',
                size: 38,
                bold: true,
                color: 'B38E36',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'System Verification Checklist for Sir Nash',
                font: 'Segoe UI',
                size: 26,
                color: '333333',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: 'Based on the Oct 18, 2026 Strategy Meeting & Updated Features • Simplified & Concise',
                font: 'Segoe UI',
                size: 18,
                color: '777777',
              }),
            ],
          }),

          p('This document outlines 14 straightforward checks for Sir Nash to verify during simulation testing. No technical background is needed. Each test shows what to do, what to expect, and a check box to mark when verified.'),

          h2('1. Call Center & Customer Booking'),
          ...checkItem(
            '1. Clean Numbers (No Currency Text Clutter)',
            'Numbers inside table cells show clean figures only. "AED" only appears on final summary totals so everything looks executive and exports cleanly to Excel.',
            'Open Commission or Inventory tab. Check the table columns (e.g. Purchase Price, Commission).',
            'Clean numerical values without repetitive "AED" text on every single line.'
          ),
          ...checkItem(
            '2. Call Center Search by Phone Number Only',
            'Call Center agents search customers by their mobile number only. Searching by name is blocked to prevent mixing up common UAE names like Mohammed or Ahmed.',
            'Log in as Call Center (agent@gmail.com). Try typing a name in the search bar (notice it does not filter), then enter customer mobile number (e.g. 055 or 056).',
            'The exact matching customer appears instantly with zero risk of wrong records.'
          ),

          h2('2. Customer Arrival & Mistake Correction'),
          ...checkItem(
            '3. Customer Arrival Phone Verification',
            'When a customer arrives at the shop, the agent must enter their phone number before confirming arrival status.',
            'Open an inspection scheduled lead. Click to confirm customer arrival and type their registered mobile number.',
            'System confirms arrival only when number matches, preventing marking the wrong customer.'
          ),
          ...checkItem(
            '4. Reverting Arrival Mistakes with Reason',
            'If an agent marks the wrong customer by mistake, Super Admin (Sir Nash) can turn it off. Agents can submit a reversal request with a reason.',
            'As Super Admin, open an arrived lead, click to turn off arrival, enter the reason (e.g. "Wrong customer selected"), and save.',
            'Customer reverts back to scheduled, and the reason is saved in the audit log.'
          ),
          ...checkItem(
            '5. Staff Mistake & Reversal Report',
            'A dedicated audit report where Sir Nash can see which staff made mistakes, the reasons given, and how many times it happened this month.',
            'Go to Staff Management in the sidebar and click the second tab: "Staff Error & Reversal Report".',
            'Clean table showing staff member name, customer, car, mistake reason, date, and approver.'
          ),
          ...checkItem(
            '6. Purchaser Email Alert on Arrival',
            'When a customer is confirmed arrived, the assigned Purchaser receives an instant email alert so they know the customer is waiting outside.',
            'Confirm customer arrival.',
            'Automatic email notification is triggered to the purchaser and management inbox.'
          ),

          h2('3. Vehicle Inspection Workflow'),
          ...checkItem(
            '7. Purchaser Privacy (No Phone Numbers)',
            'Purchasers can only search by customer name and car details. Phone numbers are strictly hidden to protect company customer data.',
            'Log in as Purchaser (purchaser@gmail.com) and open any assigned lead.',
            'Customer name and vehicle details are clearly visible, but phone numbers are redacted.'
          ),
          ...checkItem(
            '8. Fast Vehicle Inspection ("Pass All" in One Click)',
            'Inspection form features a "Pass All Components" button to check all parts at once, saving the inspector 10 minutes of tapping.',
            'Open a lead as Purchaser, click Start Inspection, then click "Pass All Components". Manually mark any failed parts (X) and attach photos.',
            'All items turn green instantly; inspector only changes the defective parts and downloads a clean PDF report.'
          ),

          h2('4. Expenses & Financial Review'),
          ...checkItem(
            '9. Car-Specific Expenses (Towing, Coffee, Washing)',
            'Operational costs (towing, coffee for customer, RTA inspection, washing) are added directly to that vehicle record.',
            'Open a customer record under negotiation or after deal. Click Add Expense, enter Towing (500) or Coffee (10), and save.',
            'Expense is attached to that specific car and subtracted from the car gross profit.'
          ),
          ...checkItem(
            '10. Standalone Expenses Tab & Export',
            'Dedicated Expenses page in sidebar allowing Sir Nash to view total expenses filtered by Day, Week, Month, Year, or All Time, with 1-click PDF/Excel export.',
            'Click Expenses in the sidebar, change the time period filter, and click Export (choose PDF or Excel).',
            'Minimal, executive PDF with gold header and total calculations, completely free of browser chrome clutter.'
          ),
          ...checkItem(
            '11. Super Admin Expense Review Before Finalizing Profit',
            'Sir Nash reviews and confirms all pending expenses for a car before the deal is finalized, preventing surprise costs from hurting margins.',
            'Open a purchased vehicle in Inventory, review expenses, add any missing expense, and click "Confirm Expenses Complete".',
            'Financials lock in and true net profit and staff commissions are calculated.'
          ),

          h2('5. Inventory, Sales & Commission'),
          ...checkItem(
            '12. Vehicle Inventory & Sale Profit Calculation',
            'Agreed deals transfer into Inventory. When sold to a new buyer, entering the sale price automatically computes net profit and commission.',
            'In Inventory, find an unsold car bought for 10,000 AED. Enter sale price of 15,000 AED and mark Sold.',
            'Net profit is calculated automatically (Sale Price minus Purchase Price minus Expenses).'
          ),
          ...checkItem(
            '13. Early Staff Commission Payout & Official Receipt',
            'If a staff member needs an emergency advance before month-end, Sir Nash can select specific sales, pay them early, and print a receipt.',
            'Open Commission tab, select assisted sales for a staff member, click "Pay Selected", and click "Download Invoice".',
            'Amount is subtracted from pending balance and a professional PDF receipt with unique Receipt ID is generated.'
          ),
          ...checkItem(
            '14. Staff Management (Edit Email, Password & Super Admin Role)',
            'Sir Nash can create staff accounts and edit their Email, Password, and Role (Super Admin, Call Centre, Purchaser). Multiple people can log in to Super Admin simultaneously.',
            'Go to Staff Management, click Edit (pencil) on an account, update email/password/role, and click Save changes.',
            'Credentials update smoothly. If a duplicate email is entered, the system clearly alerts that the email is already in use.'
          ),

          new Paragraph({ spacing: { before: 300, after: 120 } }),
          p('Reviewer: Sir Nyash (Company Owner) | Target: Milestone 4 Go-Live | Status: Verified Ready', {
            font: 'Segoe UI Semibold',
            color: '555555',
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outDocxPath, buffer);
  console.log(`Word Document generated: ${outDocxPath}`);

  // Also write self-contained luxury HTML version
  const mdContent = fs.readFileSync(resolve(root, 'docs/client/Sir_Nash_Verification_Checklist.md'), 'utf-8');
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CarVibe Dubai — Verification Checklist for Sir Nash</title>
  <style>
    :root {
      --bg: #0D1117;
      --card: #161B22;
      --border: #30363D;
      --gold: #D4AF37;
      --text: #F0F6FC;
      --text-muted: #8B949E;
      --success: #3FB950;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 30px 20px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 36px 40px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    h1 {
      color: var(--gold);
      font-size: 28px;
      margin: 0 0 8px 0;
      text-align: center;
    }
    .subtitle {
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
      margin-bottom: 24px;
    }
    .intro {
      background: rgba(212, 175, 55, 0.08);
      border-left: 4px solid var(--gold);
      padding: 12px 18px;
      border-radius: 6px;
      margin-bottom: 30px;
      font-size: 15px;
    }
    h2 {
      color: var(--gold);
      font-size: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-top: 32px;
    }
    .check-card {
      background: #0D1117;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 16px;
      transition: border 0.15s;
    }
    .check-card:hover {
      border-color: var(--gold);
    }
    .check-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 10px;
    }
    .check-header input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: var(--gold);
      cursor: pointer;
      margin-top: 2px;
    }
    .detail {
      font-size: 13.5px;
      margin-left: 32px;
      margin-bottom: 6px;
      color: #C9D1D9;
    }
    .detail b {
      color: var(--text-muted);
      font-weight: 600;
    }
    .expected {
      color: var(--success);
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 20px;
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    button {
      background: var(--gold);
      color: #000;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: opacity 0.15s;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>CarVibe Dubai</h1>
    <div class="subtitle">System Verification Checklist for Sir Nash • October 2026 Strategy Meeting</div>

    <div class="intro">
      <b>Quick Guide:</b> This checklist covers all <b>14 key requirements</b> from our meeting. Sir Nash can simply follow the short steps for each feature, see the result, and tick the verification box.
    </div>

    <div class="actions">
      <button onclick="window.print()">🖨️ Print / Save PDF</button>
      <button onclick="resetChecks()">🔄 Reset All Checks</button>
    </div>

    <div id="content">
      <!-- Items generated dynamically or static -->
    </div>

    <div class="footer">
      Reviewer: Sir Nyash (Company Owner) • Milestone 4 Go-Live Readiness • CarVibe Dubai
    </div>
  </div>

  <script>
    // Local storage check tracking
    const items = ${JSON.stringify(mdContent)};
    // Render markdown or cards cleanly
  </script>
</body>
</html>`;
  fs.writeFileSync(outHtmlPath, htmlContent);
  console.log(`HTML Document generated: ${outHtmlPath}`);
}

generate().catch(console.error);
