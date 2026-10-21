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
const outPath = resolve(root, 'docs/client/CarVibe_User_Manual_and_Training_Guide.docx');

// Helpers
const p = (text = '', opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [new TextRun({ text, font: 'Segoe UI', size: 21, color: '202020', ...opts })],
  });

const lead = (text) =>
  new Paragraph({
    spacing: { after: 160, line: 280 },
    children: [new TextRun({ text, font: 'Segoe UI', size: 22, italics: true, color: '404040' })],
  });

const h1 = (title) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text: title,
        font: 'Segoe UI',
        size: 30,
        bold: true,
        color: '09090B',
      }),
    ],
  });

const h2 = (title) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text: title,
        font: 'Segoe UI',
        size: 24,
        bold: true,
        color: 'B8860B', // Dark Gold
      }),
    ],
  });

const h3 = (title) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: title,
        font: 'Segoe UI',
        size: 22,
        bold: true,
        color: '1E293B',
      }),
    ],
  });

const bullet = (text, boldPrefix = '') =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 260 },
    children: [
      ...(boldPrefix
        ? [new TextRun({ text: boldPrefix + ' ', bold: true, font: 'Segoe UI', size: 21, color: '101010' })]
        : []),
      new TextRun({ text, font: 'Segoe UI', size: 21, color: '202020' }),
    ],
  });

const step = (num, title, description) => [
  new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({
        text: `Step ${num}: ${title}`,
        bold: true,
        font: 'Segoe UI',
        size: 23,
        color: '0F172A',
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 100, line: 260 },
    children: [new TextRun({ text: description, font: 'Segoe UI', size: 21, color: '334155' })],
  }),
];

const table = (heads, rows) => {
  const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
  const borders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: heads.map(
          (h) =>
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: '09090B' },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true, font: 'Segoe UI', size: 20, color: 'FFFFFF' })],
                }),
              ],
            }),
        ),
      }),
      ...rows.map(
        (r, idx) =>
          new TableRow({
            children: r.map(
              (c) =>
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: c, font: 'Segoe UI', size: 19, color: '1E293B' })],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });
};

const content = [];

// Title / Cover section
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 80 },
    children: [
      new TextRun({
        text: 'CARVIBE DUBAI',
        font: 'Segoe UI',
        size: 40,
        bold: true,
        color: 'B8860B',
        letterSpacing: 200,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: 'End-to-End Operational User Manual & Training Guide',
        font: 'Segoe UI',
        size: 32,
        bold: true,
        color: '09090B',
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: 'Milestone 4 Simulation Testing & Staff Training Manual (Version 1.0 — October 20, 2026)',
        font: 'Segoe UI',
        size: 20,
        italics: true,
        color: '666666',
      }),
    ],
  }),
);

// Meta Table
content.push(
  table(
    ['Document Attribute', 'Specification Details'],
    [
      ['Target Milestone', 'Milestone 4 Simulation Testing & Final Production Go-Live'],
      ['Author / Developer', 'Gene Mathew D. Wagas (Antigravity Development)'],
      ['Testing & Business Reviewer', 'Sir Nyash Nyandoro (Company Owner / Super Admin)'],
      ['Commercial Partner', 'Sir Cres Solidum'],
      ['Target System Access', 'https://carvibedubai.com/admin (Preview: http://localhost:3000/admin)'],
      ['Covered Roles', 'Call Center / Customer Service, Purchaser, Super Admin (Owners)'],
    ],
  ),
  new Paragraph({ spacing: { after: 240 } }),
);

// Section 1: Executive Overview
content.push(
  h1('1. Executive Overview & Purpose'),
  lead('This manual serves as the definitive reference guide for CarVibe Dubai operations.'),
  p('The CarVibe Dubai buying desk platform orchestrates the end-to-end acquisition, inspection, pricing, and accounting lifecycle of premium and scrap vehicles. This document fulfills three crucial organizational objectives:'),
  bullet('Allows company owner Sir Nyash to conduct an exhaustive 10-point dry run before live production rollout.', 'Simulation Testing:'),
  bullet('Instructs agents on role segmentation, phone verification, and operational hygiene.', 'Staff Onboarding & Training:'),
  bullet('Ensures every status shift, arrival override, and vehicle expense is tracked in immutable audit logs.', 'Risk & Audit Governance:'),
);

// Section 2: Role Permissions & Data Security Matrix
content.push(
  h1('2. Role Permissions & Data Security Matrix'),
  p('To safeguard corporate intelligence, prevent customer poaching, and maintain financial integrity, user accounts are strictly segmented:'),
  table(
    ['Feature / Workspace', 'Customer Service', 'Purchaser', 'Super Admin (Sir Nash)'],
    [
      ['Directory Search Bar', 'Strictly Phone Number Only', 'Strictly Customer Name Only', 'Both Name & Phone Number'],
      ['Customer Phone Visibility', 'Full Phone Visible', 'HIDDEN / REDACTED', 'Full Phone Visible'],
      ['Inspection Scheduling', 'Set Date & Time Picker', 'Read-Only Time Slot', 'Full Override Authority'],
      ['Customer Arrival Confirmation', 'Requires Mobile Verification', 'Read-Only Arrival Badge', 'Full Override Authority'],
      ['Arrival Reversal (Turn Off)', 'Mandatory Reason to Owner', 'Restricted', 'Direct Turn-Off & Approval'],
      ['Vehicle Inspection Workspace', 'Restricted', 'Pass All & Defect Tagging', 'Full Audit Footprint'],
      ['Record Deal & Purchase Price', 'Restricted', 'Input Price on Negotiation', 'Full Override Authority'],
      ['Car-Specific Expenses', 'Add Pre-Sale Incidental', 'Add Pre-Sale Incidental', 'Confirm, Edit & Reopen'],
      ['Inventory Sold & Sale Price', 'Restricted', 'Restricted', 'Finalize Sale & Net Profit'],
      ['Commission & Advance Payouts', 'Restricted', 'Own Statement View Only', 'Pay Selected & PDF Invoices'],
      ['Multi-Device Simultaneous Login', 'Single Session', 'Single Session', 'Supported for Owners'],
    ],
  ),
);

// Section 3: Call Center Workflow
content.push(
  h1('3. Phase 1: Call Center / Customer Service Agent Workflow'),
  ...step(1, 'Lead Intake & Role-Restricted Search', 'Log in with Call Center credentials. Navigate to Leads or Scrap Inquiries. In the top search bar, search exclusively by the customer\'s registered phone number (e.g. 0501234567 or +971501234567). Searching by name is blocked to prevent mixing up common UAE names like Ahmed or Mohammed.'),
  ...step(2, 'Customer Contact & WhatsApp Dialogue', 'Open the customer record. Review vehicle specifications (Year, Make, Model, Trim, Specification, and Option Level). Click Call Customer or Message on WhatsApp to engage the seller.'),
  ...step(3, 'Scheduling Vehicle Inspection Appointment', 'When the customer agrees to visit the CarVibe facility, change status to Inspection Scheduled. Use the calendar picker to select the exact date and time. In the Follow-Up Note, record critical logistics (e.g. "Driver James bringing the car, mobile 050-xxx"). Click Save Changes. The system automatically assigns a Purchaser via round-robin.'),
  ...step(4, 'Arrival Check-in via Mobile Number Verification', 'When a vehicle arrives at the yard, ask: "May I please have the registered mobile phone number used for this booking?" Locate the record, toggle Confirm Customer Arrival ON, and input the mobile number in the security modal. If the number matches, the badge turns green (Customer Arrived) and dispatches automated email alerts to the assigned Purchaser and to Sir Nash at carvibe@cresvcs.com. If wrong, confirmation is blocked.'),
  ...step(5, 'Accidental Arrival Turn-Off Request', 'If marked arrived by mistake, click the switch to turn off. A modal requires entering a clear reason (e.g. "Customer called to reschedule; driver delayed"). Submit the request to Sir Nash for review and approval.'),
);

// Section 4: Vehicle Purchaser Workflow
content.push(
  h1('4. Phase 2: Vehicle Purchaser Workflow'),
  ...step(6, 'Accessing Queue & Name Search Protection', 'Log in with Purchaser credentials. Notice the search bar filters strictly by Customer Name. Customer phone numbers are redacted to preserve data security. Look for the green "✓ Customer Arrived" badge indicating the vehicle is physically in the yard.'),
  ...step(7, 'Fast-Track "Pass All" Vehicle Inspection', 'Click Start Inspection. Above the checklist, click "Pass All Components". External Body Condition, Mechanical Components, and Tyres automatically turn green (Pass). Physically inspect the car: click "X" (Fail) on any defective item (e.g. Driver rear quarter panel), write a brief damage note, and upload a photo.'),
  ...step(8, 'Saving Inspection & PDF Generation', 'Capture or batch-upload photos for the mandatory angles (automatically compressed under 1MB). Click Save Inspection. Click Download Inspection PDF to review findings with the seller during negotiation.'),
  ...step(9, 'Deal Finalization & Incidental Expenses', 'Negotiate the vehicle price. If the customer accepts, select Deal and enter Purchase Price (AED) (e.g. 10,000). In the Expenses box, record any deal-related operational expenses (e.g. Coffee 10 AED, Towing 300 AED). Click Save Changes. The car transfers instantly into Inventory.'),
);

// Section 5: Super Admin Workflow
content.push(
  h1('5. Phase 3: Super Admin (Owner / Sir Nyash) Workflow'),
  ...step(10, 'Unrestricted Access & Multi-Device Monitoring', 'Super Admin accounts maintain complete system access, can search by both Name and Phone, and can be logged into simultaneously across multiple devices.'),
  ...step(11, 'Arrival Reversal Overrides & Audit Review', 'Sir Nash can directly revert any mistakenly marked arrival back to "Not yet arrived" or approve pending staff reversal requests. The Activity feed logs the actor and timestamp permanently.'),
  ...step(12, 'Inventory Expense Review & Sale Finalization', 'Open the vehicle in Inventory. Review expenses awaiting review. Add missing overheads (recovery, washing) and click Confirm expenses complete. When sold, input Sale Price (e.g. 15,000 AED) and mark Sold. The system computes Net Profit and staff commission shares (2% CSR, 10% Purchaser, 2% Developer).'),
  ...step(13, 'Staff Commission Settlements & Advance Payouts', 'Navigate to Commission. The grid displays clean numbers without currency letter clutter. Click Details beside any staff member. To pay early, select checkboxes beside specific assisted deals and click Pay Selected (e.g. 1,800 AED). The system deducts the amount and generates an official downloadable PDF Payment Receipt with a unique Receipt ID (e.g. A927864C).'),
);

// Section 6: Simulation Checklist
content.push(
  h1('6. Simulation Testing Checklist for Sir Nyash'),
  p('Execute this 10-point simulation test prior to live deployment:'),
  bullet('Search 050... (found); search by customer name (blocked).', '1. CSR Phone Search:'),
  bullet('Schedule inspection for today; verify driver note and purchaser assignment.', '2. Scheduling:'),
  bullet('Enter wrong mobile (blocked); enter correct mobile (confirmed).', '3. Arrival Phone Verification:'),
  bullet('Confirm automated email received by purchaser and carvibe@cresvcs.com.', '4. Arrival Email Alert:'),
  bullet('As CSR submit reversal reason; as Super Admin approve reversal.', '5. Reversal Audit Flow:'),
  bullet('Verify customer phone is hidden; search works strictly by name.', '6. Purchaser Name Search:'),
  bullet('Click "Pass All Components"; flag 1 item as Fail with photo; download PDF.', '7. Fast-Track Inspection:'),
  bullet('Enter Deal at 10,000 AED; add 10 AED coffee expense; verify car in Inventory.', '8. Deal & Expenses:'),
  bullet('Review expenses in Inventory, add towing, click "Confirm expenses complete".', '9. Inventory Expense Review:'),
  bullet('Enter sold price 15,000 AED; verify commission; execute advance payout; download PDF.', '10. Sold & Advance Payout:'),
);

// Document build
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Segoe UI', size: 21, color: '1A1A1A' },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
        },
      },
      children: content,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log('Successfully generated Word DOCX manual at:', outPath);
