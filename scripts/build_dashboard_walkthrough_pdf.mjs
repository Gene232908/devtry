import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "output/pdf");
const tmpDir = resolve(root, "tmp/pdfs");
const htmlPath = resolve(tmpDir, "dashboard-walkthrough-script.html");
const pdfPath = resolve(outDir, "carvibe-dashboard-walkthrough-script.pdf");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const sections = [
  [
    "1. Start with the business picture",
    "Good day, Sir Nyash. This is the CarVibe Business Overview. Instead of opening Leads, Inventory, Commission, and staff pages one by one, this page gives us one complete executive picture first. I use it to check four vital things: are we earning, are customer leads being followed up, is money sitting too long in unsold stock, and is the team moving deals forward?",
    "This is the executive control panel, not where we edit individual records. If I see an issue here, I click directly into that item and open the exact customer or inventory record.",
    "Today is September 12, and you will see it starts completely fresh with 0s, ready for today's live business. To see how the system tracks real activity, I will select our recent trading days - September 10 and September 11.",
    "Point to the Dashboard title, date filter, 4 main KPI cards, attention panels, stock cards, and staff section."
  ],
  [
    "2. Select the date before reading numbers",
    "Before I explain any number, I always choose the period first. Today is the default live view, but I can select This Week, This Month, Last Month, All Time, or exact calendar dates. The sales, leads, visitors, submissions, follow-up checks, and staff performance automatically refresh for the exact dates I pick.",
    "Most cards follow the date filter strictly. Current Stock is the only exception, because it answers what cars the business owns right now today, even if we bought them weeks earlier.",
    "When I select September 11 in the date picker, the Revenue of AED 1,450,000, Gross Profit of AED 200,000, and 35 customer submissions belong specifically to that day. But the unsold stock cards still show all 3 cars currently in our showroom.",
    "Open the Date Filter. Select September 11, 2026, click Apply Range, and watch the entire overview refresh."
  ],
  [
    "3. Compare periods fairly (September 11 vs September 10)",
    "When I want to know whether our business improved, I turn on Comparison Mode. The system always matches the exact number of days so the comparison is 100% fair. It never compares one day against a full week.",
    "Primary is the current period I selected (September 11). Comparison is the matching earlier period (September 10). The gold comparison banner, dual-series charts, and percentage delta badges keep the two periods crystal clear.",
    "Watch what happens when I compare September 11 against September 10: Revenue surged from AED 270,000 to AED 1,450,000 - a massive 437% increase. Gross Profit jumped from AED 20,000 to AED 200,000 - a 900% increase. Submissions grew from 25 to 35, and completed sales doubled from 2 to 4.",
    "Click Compare: Off to toggle Comparison on. Point to the gold banner at the top, then hover over the Revenue card and point out the +437% delta."
  ],
  [
    "4. Revenue, Gross Profit, Cars Sold, and Commission (How to count profit)",
    "These four cards answer completely different business questions. Revenue is the total cash collected from car buyers. Gross Profit is what remains strictly after deducting what we paid to purchase the cars. Cars Sold is the count of completed sales. Staff Commission to Pay is money already earned by staff but not yet marked paid in the system.",
    "Revenue is not Profit. Profit is not Commission. Profit is strictly: Sale Price minus Purchase Price. Commission is only the agreed percentage of positive profit, never the full sale price and never the full profit.",
    "Here is the exact math from our 4 completed sales on September 11: We sold a Porsche 911 (bought 320k, sold 380k = 60k profit), a Mercedes G 63 AMG (bought 410k, sold 475k = 65k profit), a Range Rover Autobiography (bought 290k, sold 335k = 45k profit), and a BMW M4 (bought 230k, sold 260k = 30k profit). Total Revenue is AED 1,450,000. Total purchase cost was AED 1,250,000. So Gross Profit is exactly AED 200,000. Staff commission to pay is AED 24,000 (10% Purchaser = 20k + 2% Call Centre = 4k).",
    "Point from left to right: Revenue AED 1,450,000 -> Gross Profit AED 200,000 -> Cars Sold 4 -> Staff Commission to Pay AED 24,000."
  ],
  [
    "5. Margin: calculator demonstration",
    "The Margin badge tells us how much profit the business keeps for every AED 100 of Revenue. I calculate it by taking Gross Profit divided by Revenue, then multiplying by 100 to express it as a percentage.",
    "Margin is a percentage quality metric. Revenue and Gross Profit are AED amounts. A higher revenue day is not necessarily a better day if the margin is razor thin. Margin proves the financial health of each sale.",
    "Let us use the calculator right now: Gross Profit is AED 200,000. Divide that by Revenue of AED 1,450,000, which gives 0.13793. Multiply by 100, and you get 13.793%, rounded cleanly to 13.8%. In simple words, for every AED 100 of cars sold on September 11, the business kept AED 13.80 as clean profit, compared to AED 7.40 on September 10.",
    "Point to the visible Revenue and Gross Profit cards. Open the calculator and type: 200000 ÷ 1450000 × 100. Then point to the green 13.8% Margin badge on screen."
  ],
  [
    "6. Sales and Profit chart",
    "This chart explains the daily movement behind the totals. Gold bars represent Revenue. The green line represents Gross Profit. I hover over any day to see the exact numbers behind that point.",
    "A tall gold bar does not automatically mean high profit. We read the gold Revenue bar and green Profit line together to make sure we are not selling high-cost cars at tiny margins.",
    "Notice the contrast: on September 10, the gold bar was AED 270,000 with AED 20,000 profit (7.4% margin). On September 11, the gold bar jumped to AED 1,450,000 and the green profit line surged to AED 200,000 (13.8% margin). When comparison is on, the dashed line shows yesterday's baseline right below today's result.",
    "Hover over September 11 on the chart. Read aloud both the current value and the dashed comparison line value."
  ],
  [
    "7. Lead Journey, Visitors, and Submissions",
    "Lead Journey tracks where customers are in the conversion pipeline: visitors to the website, submitted valuation forms, contacted leads, inspection bookings, inspected cars, deals agreed, and final cars sold.",
    "Visitors are site sessions. Submissions are people who actually typed their car details and verified their phone. They measure different actions, so submissions will always be a healthy fraction of total visitors.",
    "On September 11, we had 85 website visitors and 35 valuation submissions. That is an outstanding 41% form completion rate. Out of those 35 submissions, 29 were contacted by our Call Centre, 21 had inspections booked, 13 were inspected, 4 reached Deal, and all 4 deals completed as sales.",
    "Point to the Lead Journey funnel bars from top to bottom. Then point to the Website Visitors card (85 visitors) and Car Submissions card (35 leads)."
  ],
  [
    "8. Current stock and slow-stock warning (The 3 stock cards)",
    "These three stock cards look at unsold cars currently in our showroom right now. Money in Cars for Sale is the purchase money tied up in unsold vehicles. Average Time in Stock is the average waiting time in days. Cars Waiting Too Long is the urgent warning count of cars past 90 days.",
    "The first card is an AED amount, the second is an average number of days, and the third is a vehicle count. Do not confuse them - they answer three distinct business questions.",
    "We currently own 3 unsold cars in our showroom: a 2022 Nissan Patrol bought 20 days ago for AED 100,000, a 2023 BMW X5 bought 40 days ago for AED 150,000, and a 2020 Mercedes E 300 bought 95 days ago for AED 120,000. Total Money in Cars for Sale is AED 370,000. Average Time in Stock is 51 days (20 + 40 + 95 divided by 3). And because the Mercedes is 95 days old, Cars Waiting Too Long shows 1 in red - telling management to reprice or liquidate that car immediately.",
    "Point left to right across the 3 stock cards: AED 370,000 (money tied up), 51 days (average age), and 1 vehicles in red (needs urgent action)."
  ],
  [
    "9. Incomplete Forms and CSR Recovery Workflow",
    "Incomplete Forms captures visitors who started entering details on our valuation form but dropped off before submitting. This is not yet a real lead, so the system gives it to a Call Centre agent first, not to a Purchaser.",
    "A real lead has verified contact and car details. An incomplete form is an abandoned cart. We do not want Purchasers wasting time traveling for unconfirmed bookings, so Call Centre recovers them first.",
    "For example, Anna started a valuation for her 2022 BMW 3 Series in Dubai and left her phone number. Call Centre agent Agent1 sees Anna on the Incomplete list, clicks Message on WhatsApp or Call Customer, confirms her car details, and books tomorrow at 10 AM. Then the agent clicks 'Convert to Lead & Schedule Inspection' - and instantly, a real lead is created and assigned to a Purchaser.",
    "Point to the Incomplete Forms card (showing 5 incomplete forms). Click Incomplete Forms in the sidebar to show Anna's record and the action buttons."
  ],
  [
    "10. Staff Performance and Staff Results",
    "Staff Performance separates workload, action, and revenue outcome. Assigned means how many leads were given to that staff member. Handled means they logged a status change or follow-up note. Deals means their assigned lead reached Deal. The table below adds saved Gross Profit and Commission from completed sales.",
    "Handled does not mean Sold. Deal does not mean Sold either. Deal means the seller agreed to sell and the car entered our inventory. It only becomes Sold when a buyer purchases the car from our showroom.",
    "On September 11, Agent1 was assigned 18 leads and handled 16 of them, generating 2 deals and earning AED 2,000 in Call Centre commission. Purchaser1 handled the acquisition and resale of those vehicles, generating AED 105,000 in Gross Profit and earning AED 10,500 in Purchaser commission.",
    "Scroll to the Staff Performance section. Use the role dropdown to toggle between All Roles, Call Centre, and Purchasers. Point to the legend before reading the bars."
  ],
  [
    "11. Inventory role commission view",
    "On the Inventory page, Super Admin can inspect every sold car's purchase price, sale price, gross profit, and the transparent commission split across Call Centre, Purchaser, and Developer. The All roles dropdown has checkboxes to show or hide each role.",
    "This dropdown is purely a viewing filter. Unticking a role hides that column on screen, but it never alters the underlying database numbers, lead assignments, or saved commission ledger.",
    "Look at our 2021 Bentley Continental GT: bought for AED 20,000 and sold for AED 25,000, creating AED 5,000 profit. Call Centre at 2% is AED 100. Purchaser at 10% is AED 500. Developer at 2% is AED 100. If I untick Purchaser in the dropdown, the Purchaser column disappears from the view, but the saved AED 500 commission remains intact in the database.",
    "Click Inventory in the sidebar. Click the All roles dropdown. Untick Purchaser to show the column hide, then re-tick it to show it reappear."
  ],
  [
    "12. Close the walkthrough and live demonstration",
    "To summarize, the CarVibe Dashboard gives executive management real-time control over revenue, pipeline conversion, showroom inventory aging, and team commissions. Every single number on screen connects directly to a verified customer enquiry and a real bank transaction.",
    "The Dashboard is the executive cockpit. Leads, Inventory, Commission, Incomplete Forms, and Settings are where daily operations happen.",
    "And now, Sir Nyash, notice that when we return to Today (September 12), the screen is completely clean with 0s because no transactions have taken place yet today. Let us open our live customer website right now, submit a real valuation test, and watch the system capture the lead, notify the team, and update this dashboard in real time.",
    "Switch the date filter back to Today. Show the clean 0 baseline. Open http://localhost:3001 in a new tab to invite Sir Nyash to do a live test."
  ]
];

const possibleQuestion = {
  "1. Start with the business picture": [
    "Are these numbers hardcoded or simulated on the frontend?",
    "No. Every number is queried live from our Supabase database tables (leads, inventory, staff_commission_entries, and events). There is zero hardcoded mock data in the dashboard code."
  ],
  "2. Select the date before reading numbers": [
    "Why does current stock not disappear when I pick a past date?",
    "Because current stock represents what the business owns right now today. It is current capital exposure, not a historical sales total."
  ],
  "3. Compare periods fairly (September 11 vs September 10)": [
    "Why does the system only compare equal day lengths?",
    "Because comparing 1 day against 30 days would be misleading. Matching equal day lengths ensures that percentage gains or drops reflect true operational performance."
  ],
  "4. Revenue, Gross Profit, Cars Sold, and Commission (How to count profit)": [
    "What happens if a car is sold at a loss?",
    "If a car is sold at a loss, Gross Profit is negative or zero, and commission is strictly zero. Under our agreed business rules, a loss never generates a commission and never penalizes other profitable sales."
  ],
  "5. Margin: calculator demonstration": [
    "Why is margin better than looking at revenue alone?",
    "Because a business can generate AED 1,000,000 in revenue but only keep AED 10,000 in profit (1% margin). Margin tells us whether we are buying and pricing vehicles profitably."
  ],
  "6. Sales and Profit chart": [
    "What do the two different lines represent during comparison?",
    "The solid line represents the selected primary period (September 11), while the dashed line represents the exact matching baseline period (September 10)."
  ],
  "7. Lead Journey, Visitors, and Submissions": [
    "Why are submissions lower than website visitors?",
    "Because not every site visitor owns a car they want to sell today. Visitors measure traffic interest, while submissions measure verified sellers ready for an inspection."
  ],
  "8. Current stock and slow-stock warning (The 3 stock cards)": [
    "Why do we need the 90-day warning card if we already have average days?",
    "Because an average can be deceptive. Two brand new cars bought yesterday can drag down the average age even if one expensive vehicle has been stuck on the lot for 100 days. The warning card highlights that specific risk."
  ],
  "9. Incomplete Forms and CSR Recovery Workflow": [
    "Can an incomplete form be converted without an inspection booking?",
    "No, by design. Incomplete forms must be qualified and confirmed by the Call Centre before converting to a formal lead. This protects Purchasers from chasing unverified numbers."
  ],
  "10. Staff Performance and Staff Results": [
    "Does a Deal immediately pay commission to the staff?",
    "No. Reaching a Deal means we successfully bought the car into inventory. Staff commission is only earned and calculated once that inventory car is successfully sold to an end buyer."
  ],
  "11. Inventory role commission view": [
    "Can an individual staff member edit their commission percentage here?",
    "No. Commission rates are governed by system contracts (2% Call Centre, 10% Purchaser, 2% Developer). This view is an executive inspection tool for Super Admin only."
  ],
  "12. Close the walkthrough and live demonstration": [
    "What are the next steps before full production release?",
    "The software workflow is 100% complete and operational. We only require final client sign-off on legal data retention policies and Meta WhatsApp Business API registration."
  ]
};

const box = (name, title, text) => `<div class="box ${name}"><strong>${title}</strong><p>${text}</p></div>`;
const body = sections.map(([title, say, difference, scenario, show]) => {
  const [question, answer] = possibleQuestion[title];
  return `<section><h2>${title}</h2>${box("say", "SAY THIS (Natural Spoken Script)", say)}${box("difference", "EXPLAIN THE DIFFERENCE", difference)}${box("scenario", "GIVE THIS EXACT SCENARIO & NUMBERS", scenario)}${box("show", "SHOW THIS ON SCREEN", show)}${box("question", "IF SIR NYASH ASKS", question)}${box("answer", "ANSWER LIKE THIS", answer)}</section>`;
}).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>CarVibe Dashboard Walkthrough Script</title><style>
@page{size:A4;margin:14mm 15mm 16mm}*{box-sizing:border-box}body{font-family:Arial,Calibri,sans-serif;color:#111827;font-size:10pt;line-height:1.42;margin:0}h1{font-size:24pt;margin:0 0 8px;color:#0f172a}h2{font-size:14.5pt;margin:0 0 8px;padding-bottom:4px;border-bottom:2px solid #cbd5e1;color:#1e293b}p{margin:3px 0 0}section{page-break-inside:avoid;margin-bottom:14px}.cover{page-break-after:always;padding-top:75mm;text-align:center}.cover h1{font-size:28pt;color:#0f172a}.cover p{font-size:12.5pt;color:#475569}.guide{margin:20px 0 0;border:1px solid #0f172a;padding:12px;text-align:left;background:#f8fafc}.guide strong{display:block;margin-bottom:5px;font-size:10.5pt}.box{padding:8px 10px;margin:7px 0;border:1px solid #cbd5e1;border-radius:4px;page-break-inside:avoid}.box strong{font-size:9pt;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:2px}.say{background:#fffbeb;border-color:#fde68a;color:#92400e}.difference{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}.scenario{background:#f0fdf4;border-color:#bbf7d0;color:#166534}.show{background:#f8fafc;border-color:#e2e8f0;color:#334155}.question{background:#fef2f2;border-color:#fecaca;color:#991b1b}.answer{background:#faf5ff;border-color:#e9d5ff;color:#6b21a8}footer{position:fixed;bottom:-8mm;left:0;right:0;text-align:center;color:#64748b;font-size:8pt}
</style></head><body><footer>CarVibe Dashboard Walkthrough - Presenter Script</footer><div class="cover"><h1>CARVIBE DUBAI</h1><p>Executive Dashboard Presenter Script</p><p>Natural demonstration flow + live mathematical formulas + exact database scenarios</p><div class="guide"><strong>How to use this demonstration script</strong>1. <strong>Yellow Box (SAY THIS):</strong> Read naturally while looking at Sir Nyash.<br>2. <strong>Blue Box (EXPLAIN THE DIFFERENCE):</strong> Explain why this card is unique.<br>3. <strong>Green Box (GIVE THIS SCENARIO):</strong> Quote the exact live numbers from September 10, 11, and our showroom stock.<br>4. <strong>Grey Box (SHOW THIS ON SCREEN):</strong> Click and point on the dashboard as instructed.<br>5. <strong>Red & Purple Boxes:</strong> Use only when Sir Nyash asks a question.</div></div>${body}</body></html>`;

fs.writeFileSync(htmlPath, html, "utf8");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
execFileSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox", `--print-to-pdf=${pdfPath}`, htmlPath], { stdio: "inherit" });
console.log('PDF successfully built at:', pdfPath);
