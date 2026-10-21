import fs from 'node:fs';
import { resolve } from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
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
            spacing: { after: 200 },
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
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: 'October 18, 2026 Strategy Meeting Action Items Only • 12 Tasks • Simplified & Concise',
                font: 'Segoe UI',
                size: 18,
                color: '777777',
              }),
            ],
          }),

          p('This checklist contains only the 12 specific tasks and features agreed upon during the October 18 meeting between Sir Nash, Cres, and Gene. No extra items have been added.'),

          h2('1. Display & Formatting'),
          ...checkItem(
            '1. Remove Currency Labels (AED) from Table Columns',
            'Numbers inside table cells show clean figures only. "AED" only appears on final summary totals so everything looks executive and exports cleanly to Excel.',
            'Open Commission or Inventory tab. Check the table columns (e.g. Purchase Price, Commission).',
            'Clean numerical values without repetitive "AED" text on every single line.'
          ),
          ...checkItem(
            '2. Standardize Date Displays',
            'Date formats across the application are standardized to a clean, consistent format without confusing extra text.',
            'Check dates displayed in Payment History, Inventory, and Leads.',
            'Dates appear clean, uniform, and easy to read across all screens.'
          ),

          h2('2. Role-Based Search & Security'),
          ...checkItem(
            '3. Call Center Search (Phone Number Only)',
            'Call Center agents search customers by their mobile number only. Searching by name is blocked to prevent mixing up common UAE names like Mohammed or Ahmed.',
            'Log in as Call Center (agent@gmail.com). Try typing a name in the search bar (notice it does not filter), then enter customer mobile number (e.g. 055 or 056).',
            'The exact matching customer appears immediately with zero risk of wrong records.'
          ),
          ...checkItem(
            '4. Purchaser Search (Name Only & Hidden Phone Numbers)',
            'Purchasers can only search by customer name and car details. Customer phone numbers are strictly hidden from purchasers to protect company data.',
            'Log in as Purchaser (purchaser@gmail.com). Search for a customer by name in the search bar and open the record.',
            'Customer name and car details are visible, but the phone number is hidden/redacted.'
          ),

          h2('3. Customer Arrival & Mistake Correction'),
          ...checkItem(
            '5. Customer Arrival Phone Verification',
            'When a customer arrives at the shop, the agent must enter their phone number before confirming arrival status to guarantee their identity.',
            'Open an inspection scheduled lead. Click to confirm customer arrival and type their registered mobile number.',
            'System confirms arrival only when number matches, preventing marking the wrong customer.'
          ),
          ...checkItem(
            '6. Arrival Status Reversal with Mandatory Reason',
            'If an agent marks the wrong customer by mistake, Super Admin (Sir Nash) can turn it off. Agents can submit a reversal request with a mandatory reason.',
            'As Super Admin, open an arrived lead, click to turn off arrival, enter the reason (e.g. "Wrong customer selected"), and save.',
            'Customer reverts back to scheduled, and the reason is saved in the audit log.'
          ),
          ...checkItem(
            '7. Staff Mistake & Reversal Report',
            'A dedicated audit report where Sir Nash can see which staff made mistakes, the reasons given, and how many times it happened this month.',
            'Go to Staff Management in the sidebar and click the second tab: "Staff Error & Reversal Report".',
            'Clean table showing staff member name, customer, car, mistake reason, date, and approver (Sir Nash).'
          ),
          ...checkItem(
            '8. Purchaser Email Alert on Arrival',
            'When a customer is confirmed arrived, the assigned Purchaser receives an instant email alert so they know the customer is waiting outside.',
            'Confirm customer arrival.',
            'Automatic email notification is triggered to the purchaser and management inbox.'
          ),

          h2('4. Vehicle Inspection'),
          ...checkItem(
            '9. Inspection Form "Select All Pass" Button',
            'Inspection form features a "Pass All Components" button to check all parts at once, saving the inspector 10 minutes of tapping.',
            'Open a lead as Purchaser, click Start Inspection, then click "Pass All Components". Manually mark any failed parts (X) and attach photos.',
            'All items turn green instantly; inspector only changes the defective parts and downloads a clean PDF report.'
          ),

          h2('5. Expense Tracking'),
          ...checkItem(
            '10. Car-Specific Expenses & Summary Tab',
            'Operational costs (towing, coffee for customer, washing) are added directly to that vehicle record, and a dedicated Expenses tab shows all company expenses.',
            'Open a customer record under negotiation or after deal, click Add Expense, enter Towing (500) or Coffee (10), and view Expenses tab in sidebar.',
            'Expenses attach directly to the car, subtract from gross profit, and appear in the Expenses tab with 1-click PDF/Excel export.'
          ),

          h2('6. Super Admin Access & Control'),
          ...checkItem(
            '11. Unlimited Super Admin System Access',
            'Super Admin accounts (Sir Nash) maintain complete, unrestricted access across all screens, financial records, expenses, and staff controls.',
            'Log in as Super Admin and navigate across all sidebar tabs.',
            'Full access to view, edit, override, and manage all records across the entire system.'
          ),
          ...checkItem(
            '12. Super Admin Simultaneous Multi-Device Login',
            'Company owners can log in to the Super Admin account from multiple devices or browsers at the same time without getting kicked out.',
            'Log in to Super Admin on a laptop and another device at the same time.',
            'Both sessions stay active simultaneously for administrative oversight.'
          ),

          new Paragraph({ spacing: { before: 300, after: 120 } }),
          p('Reviewer: Sir Nyash (Company Owner) | Total Tasks: 12 Meeting Items | Status: Ready for Testing', {
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

  // Write standalone HTML
  const mdContent = fs.readFileSync(resolve(root, 'docs/client/Sir_Nash_Verification_Checklist.md'), 'utf-8');
  fs.writeFileSync(outHtmlPath, mdContent);
  console.log(`HTML Document updated: ${outHtmlPath}`);
}

generate().catch(console.error);
