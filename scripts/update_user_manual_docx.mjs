import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const originalPath = path.resolve('User Manual.original.docx');
const outputPath = path.resolve('User Manual.docx');

function validateXmlTags(xml) {
  const tags = [];
  const regex = /<\/?([a-zA-Z0-9_:]+)(?:\s+[^>]*?)?(\/?)>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const full = match[0];
    const name = match[1];
    const isSelfClosing = match[2] === '/' || full.endsWith('/>');
    const isClosing = full.startsWith('</');

    if (!isSelfClosing) {
      if (isClosing) {
        if (tags.length === 0) {
          throw new Error(`Unexpected closing tag </${name}> at index ${match.index}`);
        }
        const top = tags.pop();
        if (top.name !== name) {
          throw new Error(
            `Mismatched tag: expected </${top.name}> but found </${name}> at index ${match.index}.\nContext: ${xml.slice(
              match.index - 80,
              match.index + 80,
            )}`,
          );
        }
      } else {
        tags.push({ name, index: match.index });
      }
    }
  }

  if (tags.length > 0) {
    throw new Error(`Unclosed XML tags remaining: ${tags.map(t => t.name).join(', ')}`);
  }
}

async function run() {
  const buf = fs.readFileSync(originalPath);
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file('word/document.xml').async('string');

  console.log('Original XML tag validation...');
  validateXmlTags(xml);
  console.log('Original XML is completely valid.');

  // 1. Section 3.8 Callout Note (occurs in body > 100000)
  const oldS38Note = `The request is currently remembered only on the computer you used to send it. Always tell your Super Admin directly as well (by message or phone) so they can act on it.`;
  const newS38Note = `Your request is saved immediately in the system and automatically sends an email alert to Sir Nash. A notification badge also lights up in Sir Nash's dashboard header so they can review and approve it without delay.`;

  if (!xml.includes(oldS38Note)) {
    throw new Error('Could not find oldS38Note');
  }
  xml = xml.replace(oldS38Note, newS38Note);
  console.log('1. Replaced Section 3.8 note.');

  // 2. Section 5.2 Daily Routine item
  const oldS52 = `Check for arrival reversal requests from the Call Centre and act on them.`;
  const newS52 = `Check the Notification Bell in your top header for any waiting arrival reversal requests and resolve them.`;

  if (!xml.includes(oldS52)) {
    throw new Error('Could not find oldS52');
  }
  xml = xml.replace(oldS52, newS52);
  console.log('2. Replaced Section 5.2 daily routine item.');

  // 3. Section 5.5: Controlling Customer Arrival
  // Find in body after index 400000 (past Table of Contents)
  const s55HeadingStr = `Approving or declining a Call Centre request`;
  const s55HeadingIdx = xml.indexOf(s55HeadingStr, 400000);
  if (s55HeadingIdx === -1) {
    throw new Error('Could not find s55HeadingStr in body after 400000');
  }
  const s55ParaStart = xml.lastIndexOf('<w:p ', s55HeadingIdx);

  const s56HeadingIdx = xml.indexOf('5.6 Inspections', s55HeadingIdx);
  if (s56HeadingIdx === -1) {
    throw new Error('Could not find 5.6 Inspections in body after Section 5.5');
  }
  const s56ParaStart = xml.lastIndexOf('<w:p ', s56HeadingIdx);

  const newS55Content = `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Approving or declining staff reversal requests</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>When a Call Centre Agent or Purchaser marks an arrival by mistake, they cannot switch it off themselves. The system requires them to submit a formal reversal request with an explanation reason.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>The Super Admin Arrival Reversal Bell</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>You do not need to search through leads or wait for phone calls to know when staff need an arrival reversed. The system notifies you automatically:</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Header Notification Bell: </w:t></w:r><w:r><w:t>A yellow bell icon in the top navigation bar displays a live badge count of how many reversal requests are waiting for your review.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Real-Time Alert Toast: </w:t></w:r><w:r><w:t>When a staff member submits a request while you are using the dashboard, a pop-up alert appears on your screen naming the staff member, customer, and vehicle.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Quick Preview Dropdown: </w:t></w:r><w:r><w:t>Clicking the bell opens a summary list showing who submitted the request, their role, the customer, vehicle, submission time, and their stated reason. It also clearly labels whether it is a regular Car Valuation Lead or a Scrap Inquiry.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">One-Click Report Link: </w:t></w:r><w:r><w:t>Click "Open Reversals Report" at the bottom of the dropdown to jump straight to the Staff Error &amp; Reversal Report table.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Taking Action on a Request</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>You can resolve requests in two convenient ways:</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">From the Lead Page: </w:t></w:r><w:r><w:t>Open the lead. A review banner shows "Customer Service Requested Arrival Reversal" with their reason. Click Approve &amp; Turn Off Arrival if the mistake is genuine, or Decline Request if the customer is on-site.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Directly in the Staff Report: </w:t></w:r><w:r><w:t>In the Staff Error &amp; Reversal Report table, each pending request has Approve and Decline buttons so you can resolve multiple requests quickly without opening each lead.</w:t></w:r></w:p>
<w:p><w:pPr><w:spacing w:before="60" w:after="160"/><w:ind w:left="284"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Result: </w:t></w:r><w:r><w:t>When approved, the customer's arrival is turned off, Purchaser locking is cleared, and the lead is restored so the Call Centre can continue managing or rescheduling it.</w:t></w:r></w:p>`;

  xml = xml.slice(0, s55ParaStart) + newS55Content + xml.slice(s56ParaStart);
  console.log('3. Replaced Section 5.5 content.');

  // 4. Section 5.14: Staff Error & Reversal Report
  // Find in body after index 500000 (past Table of Contents)
  const s514HeadingStr = `5.14 Staff Error &amp; Reversal Report`;
  const s514HeadingIdx = xml.indexOf(s514HeadingStr, 500000);
  if (s514HeadingIdx === -1) {
    throw new Error('Could not find s514HeadingStr in body after 500000');
  }
  // Find the end of this heading paragraph
  const s514ParaEnd = xml.indexOf('</w:p>', s514HeadingIdx) + 6;

  const s515HeadingIdx = xml.indexOf('5.15 Incomplete Forms', s514ParaEnd);
  if (s515HeadingIdx === -1) {
    throw new Error('Could not find 5.15 Incomplete Forms in body after Section 5.14');
  }
  const s515ParaStart = xml.lastIndexOf('<w:p ', s515HeadingIdx);

  const newS514Content = `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>The Staff Error &amp; Reversal Report gives management and trainers a complete, transparent record of every time a customer arrival was reversed or requested to be reversed. This helps trainers spot accidental clicks early, identify process misunderstandings, and support team members who need extra coaching.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>How to Open the Report</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t xml:space="preserve">Click the </w:t></w:r><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Staff Management</w:t></w:r><w:r><w:t xml:space="preserve"> tab in the left sidebar, then click the </w:t></w:r><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Staff Error &amp; Reversal Report</w:t></w:r><w:r><w:t xml:space="preserve"> tab at the top. You can also jump directly to this screen by clicking the Notification Bell in the top bar and choosing </w:t></w:r><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>"Open Reversals Report"</w:t></w:r><w:r><w:t>.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Summary Overview Cards</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Pending Review: </w:t></w:r><w:r><w:t>The number of reversal requests currently waiting for Super Admin review and decision.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Reversals This Month: </w:t></w:r><w:r><w:t>The total number of arrival reversals completed during the current calendar month.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">All-Time Recorded: </w:t></w:r><w:r><w:t>The total number of reversal incidents recorded since system launch.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Staff Involved: </w:t></w:r><w:r><w:t>How many individual team members have requested or received an arrival reversal.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Report Navigation: Two Specialized Views</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>To keep daily operations fast while giving trainers in-depth insight, the report provides two dedicated views using the view buttons at the top of the table:</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>1. Reversal Requests View (Action Mode)</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>This is your daily operational desk for reviewing and actioning requests:</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Status Filter Tabs: </w:t></w:r><w:r><w:t>Filter the table by Pending (default, so you see what needs action right now), Approved, Declined, or All Requests.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Inquiry Type Clarity: </w:t></w:r><w:r><w:t>Each entry clearly labels whether the lead originated as a Car Valuation Lead or a Scrap Inquiry, giving you full operational context before deciding.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">One-Click Actions: </w:t></w:r><w:r><w:t>You can click Approve or Decline directly inside the table row. The notification bell counter and status update immediately without page refreshes.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Direct Lead Access: </w:t></w:r><w:r><w:t>Click the Lead ID in any row to open the complete customer record and inspect the full history.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>2. Staff Frequency View (Training &amp; Coaching Mode)</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:t>This view is designed specifically for trainers and department managers to monitor mistake patterns over time:</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Staff Breakdown Table: </w:t></w:r><w:r><w:t>Lists each staff member along with their role, Total Reversals, Reversals This Month, Date of Last Reversal, and a visual Relative Frequency bar.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Spotting Training Opportunities: </w:t></w:r><w:r><w:t>If an agent shows repeated reversals, the trainer can easily identify if they need assistance with customer identification, phone verification, or yard handovers.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Filter View Button: </w:t></w:r><w:r><w:t>Click "Filter View" next to any staff member's name to instantly filter the incidents list to show only that individual's history.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Searching and Exporting</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Search Box: </w:t></w:r><w:r><w:t>Quickly find records by searching for a staff member's name, customer name, vehicle, or keyword from the stated reason.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Date Filters: </w:t></w:r><w:r><w:t>Filter incidents across All Time, This Month, or the Last 30 Days.</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Export Report (CSV): </w:t></w:r><w:r><w:t>Click "Export Report (CSV)" to download the filtered table as a spreadsheet for management meetings, performance audits, or trainer files.</w:t></w:r></w:p>`;

  xml = xml.slice(0, s514ParaEnd) + newS514Content + xml.slice(s515ParaStart);
  console.log('4. Replaced Section 5.14 content.');

  console.log('Validating final updated XML tag balance...');
  validateXmlTags(xml);
  console.log('Final XML tag validation passed with 100% precision!');

  zip.file('word/document.xml', xml);

  const outBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(outputPath, outBuf);
  console.log(`Saved updated docx to ${outputPath}. Size: ${outBuf.length} bytes.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
