"use client";

import { useState, useEffect } from "react";
import { Check, Copy, ExternalLink, Printer, RotateCcw, ShieldCheck } from "lucide-react";

type CheckItem = {
  id: string;
  category: string;
  title: string;
  what: string;
  how: string[];
  see: string;
};

const CHECKLIST: CheckItem[] = [
  // 1. Call Center & Booking
  {
    id: "clean-numbers",
    category: "1. Call Center & Customer Booking",
    title: "Clean Numbers (No Currency Text Clutter)",
    what: 'Numbers in tables show clean values only. "AED" text is removed from grid columns and only shown on final totals so reports look neat and export cleanly to Excel.',
    how: [
      "Open the Commission or Inventory tab in the admin dashboard.",
      "Look at the columns showing amounts (e.g. Purchase Price, Commission).",
    ],
    see: 'Numbers are clean without repetitive "AED" text on every single line. Final totals clearly show "AED".',
  },
  {
    id: "call-center-search",
    category: "1. Call Center & Customer Booking",
    title: "Call Center Search (Phone Number Only)",
    what: "Call Center agents search customers using their mobile number only. Searching by name is blocked to prevent mixing up common UAE names like Mohammed or Ahmed.",
    how: [
      "Log in as Call Center (agent@gmail.com).",
      "Type a customer's name in the top search bar (notice it does not filter).",
      "Enter the customer's mobile number (e.g., 055 or 056).",
    ],
    see: "The exact matching customer appears immediately with zero risk of wrong records.",
  },

  // 2. Arrival & Mistakes
  {
    id: "arrival-phone-verification",
    category: "2. Customer Arrival & Mistake Correction",
    title: "Customer Arrival Verification (Phone Number Required)",
    what: "When a customer arrives at the shop, the agent must enter their phone number before confirming arrival status to guarantee their identity.",
    how: [
      "Open any customer with an Inspection Scheduled status.",
      "Click to confirm Customer Arrived.",
      "Enter the customer's registered mobile number when prompted.",
    ],
    see: "The system confirms arrival only when the number matches, preventing marking the wrong customer.",
  },
  {
    id: "revert-arrival-mistake",
    category: "2. Customer Arrival & Mistake Correction",
    title: "Fixing Mistakes: Reverting Arrived Status with Reason",
    what: "If an agent accidentally marks the wrong customer as arrived, Super Admin (Sir Nash) can turn it off. Agents can submit a reversal request with a written reason.",
    how: [
      "As Super Admin, open a lead that was marked arrived.",
      "Click to turn off arrival status.",
      "Enter a short reason (e.g., 'Agent selected wrong Mohammed') and save.",
    ],
    see: "The customer reverts back to Inspection Scheduled, and the reason is recorded in the activity log.",
  },
  {
    id: "staff-error-report",
    category: "2. Customer Arrival & Mistake Correction",
    title: "Staff Mistake & Reversal Report",
    what: "A dedicated audit report where Sir Nash can see which staff member made arrival mistakes, the reasons entered, and how often it happened this month.",
    how: [
      "As Super Admin, go to Staff Management in the sidebar.",
      "Click the second tab: 'Staff Error & Reversal Report'.",
    ],
    see: "A clean table showing the staff member's name, customer, car, mistake reason, date, and approver (Sir Nash).",
  },
  {
    id: "purchaser-arrival-alert",
    category: "2. Customer Arrival & Mistake Correction",
    title: "Purchaser Email Alert on Customer Arrival",
    what: "When a customer is confirmed arrived at the shop, the assigned Purchaser receives an instant email alert so they know the customer is waiting outside.",
    how: [
      "Confirm a customer's arrival in the dashboard.",
    ],
    see: "An automated arrival alert email is triggered for the assigned Purchaser and management inbox.",
  },

  // 3. Purchaser & Inspection
  {
    id: "purchaser-privacy",
    category: "3. Vehicle Inspection Workflow",
    title: "Purchaser Privacy (No Customer Phone Numbers)",
    what: "Purchasers can only search by customer name and car details. Customer phone numbers are strictly hidden from Purchasers to protect company customer data.",
    how: [
      "Log in as Purchaser (purchaser@gmail.com).",
      "Open any assigned customer record.",
    ],
    see: "Customer name and vehicle details are clearly visible, but phone numbers are hidden/redacted.",
  },
  {
    id: "pass-all-inspection",
    category: "3. Vehicle Inspection Workflow",
    title: "Fast Vehicle Inspection ('Pass All' in One Click)",
    what: "The inspection form has a 'Pass All Components' button to check all parts at once, saving the inspector 10 minutes of manual clicking.",
    how: [
      "Open a lead as Purchaser and click 'Start Inspection'.",
      "Click the 'Pass All Components' button.",
      "Manually mark any defective item as failed (❌) and attach photos.",
      "Save the inspection and download the report.",
    ],
    see: "All items turn green instantly. Inspector only changes the defective parts and downloads a clean PDF report.",
  },

  // 4. Expenses & Review
  {
    id: "car-specific-expenses",
    category: "4. Expenses & Financial Review",
    title: "Car-Specific Expenses (Coffee, Towing, Washing)",
    what: "Operational costs (towing, coffee for customer, RTA inspection, washing) are added directly under that specific car's record.",
    how: [
      "Open a customer record under negotiation or after deal.",
      "Click 'Add Expense', enter Towing (500 AED) or Coffee (10 AED), and save.",
    ],
    see: "The expense is attached directly to that vehicle and subtracted from the car's gross profit.",
  },
  {
    id: "expenses-summary-tab",
    category: "4. Expenses & Financial Review",
    title: "Standalone Expenses Tab & Export (PDF & Excel)",
    what: "A dedicated Expenses page in the sidebar allowing Sir Nash to view total expenses filtered by Day, Week, Month, Year, or All Time, with 1-click PDF/Excel export.",
    how: [
      "Click Expenses in the sidebar.",
      "Change the time period filter (Day, Week, Month, Year).",
      "Click the Export button and choose PDF or Excel.",
    ],
    see: "A clean, executive report showing total expenses, car details, date, and staff member, with clean formatting and no clutter.",
  },
  {
    id: "super-admin-expense-review",
    category: "4. Expenses & Financial Review",
    title: "Super Admin Expense Review Before Finalizing Profit",
    what: "Sir Nash reviews and confirms all pending expenses for a car before the deal is finalized, preventing surprise costs from hurting margins.",
    how: [
      "As Super Admin, open a purchased vehicle in Inventory.",
      "Review the listed expenses. Add any missing cost (e.g. washing).",
      "Click 'Confirm Expenses Complete'.",
    ],
    see: "The vehicle financials lock in, calculating the true net profit and staff commissions.",
  },

  // 5. Inventory, Sales & Commission
  {
    id: "inventory-sale-profit",
    category: "5. Inventory, Sales & Commission",
    title: "Vehicle Inventory & Net Profit Calculation",
    what: "When a deal is agreed, the car moves into Inventory. When sold to a buyer, typing the sale price automatically computes net profit and commissions.",
    how: [
      "In Inventory, find an unsold car bought for 10,000 AED.",
      "Enter a sale price of 15,000 AED and mark it as Sold.",
    ],
    see: "Net profit is calculated automatically (Sale Price minus Purchase Price minus Expenses).",
  },
  {
    id: "early-commission-payout",
    category: "5. Inventory, Sales & Commission",
    title: "Early Staff Commission Payout & Official Receipt",
    what: "If a staff member needs an emergency advance before month-end, Sir Nash can select specific sales, pay them early, and print a receipt.",
    how: [
      "Open Commission in the sidebar.",
      "Select assisted sales for a staff member.",
      "Click 'Pay Selected' and confirm.",
      "Click 'Download Invoice'.",
    ],
    see: "Amount is subtracted from pending balance and a professional PDF receipt with a unique Receipt ID is generated.",
  },
  {
    id: "staff-management-credentials",
    category: "5. Inventory, Sales & Commission",
    title: "Staff Management (Edit Email, Password & Super Admin Role)",
    what: "Sir Nash can create staff accounts and edit their Email, Password (reset credentials), and Role (Super Admin, Call Centre, Purchaser). Multiple people can log in to Super Admin simultaneously.",
    how: [
      "Go to Staff Management in the sidebar.",
      "Click the pencil (Edit) icon on any account.",
      "Update email, password, or role, and click Save changes.",
    ],
    see: "Credentials update smoothly. If a duplicate email is entered, the system clearly alerts that the email is already in use.",
  },
];

export default function VerificationChecklistPage() {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("carvibe_nash_verification_v1");
      if (saved) setCheckedMap(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function toggleCheck(id: string) {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("carvibe_nash_verification_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function resetAll() {
    if (confirm("Reset all verification checks back to uncompleted?")) {
      setCheckedMap({});
      try {
        localStorage.removeItem("carvibe_nash_verification_v1");
      } catch {
        // ignore
      }
    }
  }

  const completedCount = Object.values(checkedMap).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / CHECKLIST.length) * 100);

  function copyForGoogleDocs() {
    let text = `# CarVibe Dubai — System Verification Checklist for Sir Nash\n\n`;
    text += `Target: Milestone 4 Go-Live & Simulation Testing\n`;
    text += `Basis: Oct 18, 2026 Strategy Meeting & Updated System\n\n`;
    text += `Progress: ${completedCount} of ${CHECKLIST.length} Completed (${progressPercent}%)\n\n`;
    text += `---\n\n`;

    let currentCategory = "";
    for (const item of CHECKLIST) {
      if (item.category !== currentCategory) {
        currentCategory = item.category;
        text += `\n## ${currentCategory}\n\n`;
      }
      const isDone = checkedMap[item.id] ? "[x]" : "[ ]";
      text += `${isDone} ${item.title}\n`;
      text += `  • What it is: ${item.what}\n`;
      text += `  • How to test:\n`;
      for (const step of item.how) {
        text += `    - ${step}\n`;
      }
      text += `  • What you will see: ${item.see}\n\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Group by category
  const categories = Array.from(new Set(CHECKLIST.map((item) => item.category)));

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#F0F6FC] px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="rounded-xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#161B22] to-[#0D1117] p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-3 py-1 text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Owner Simulation Testing
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                CarVibe Dubai Verification Checklist
              </h1>
              <p className="text-sm text-[#8B949E] mt-1">
                Prepared for Sir Nash • Based on the October 18, 2026 Strategy Meeting
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/admin"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3.5 py-2 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition"
              >
                <span>Open Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <p className="text-sm text-[#C9D1D9] leading-relaxed mb-6 bg-[#0D1117]/60 p-4 rounded-lg border border-[#30363D]">
            Welcome, Sir Nash! This simplified checklist has <b>14 practical checks</b> covering every feature from our meeting.
            No technical knowledge is required. Simply follow the short steps, check the result, and tick the box.
          </p>

          {/* Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#8B949E]">Simulation Progress</span>
              <span className="text-[#D4AF37] font-semibold">
                {completedCount} of {CHECKLIST.length} Verified ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-[#21262D] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#D4AF37] to-[#E6C65C] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[#30363D]">
            <button
              onClick={copyForGoogleDocs}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black hover:bg-[#E6C65C] transition shadow-md"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied to Clipboard!" : "Copy for Google Docs"}
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#30363D] bg-[#21262D] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#30363D] transition"
            >
              <Printer className="w-4 h-4 text-[#8B949E]" />
              Print / Save PDF
            </button>

            {completedCount > 0 && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-[#8B949E] hover:text-[#F85149] transition ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Checklist Categories */}
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryItems = CHECKLIST.filter((i) => i.category === category);
            return (
              <section key={category} className="space-y-3">
                <h2 className="text-lg font-semibold text-[#D4AF37] tracking-wide flex items-center gap-2 border-b border-[#21262D] pb-2">
                  <span>{category}</span>
                </h2>

                <div className="space-y-3">
                  {categoryItems.map((item) => {
                    const isChecked = !!checkedMap[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`cursor-pointer rounded-xl border p-4 sm:p-5 transition-all duration-150 ${
                          isChecked
                            ? "border-[#3FB950]/50 bg-[#15231B]/40 shadow-sm"
                            : "border-[#30363D] bg-[#161B22] hover:border-[#D4AF37]/50"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 h-5 w-5 rounded border-[#30363D] text-[#D4AF37] focus:ring-[#D4AF37]/40 cursor-pointer accent-[#D4AF37]"
                          />

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-base font-semibold transition ${
                                isChecked ? "text-[#3FB950] line-through opacity-85" : "text-white"
                              }`}
                            >
                              {item.title}
                            </h3>

                            <div className="mt-2 text-xs sm:text-sm text-[#C9D1D9] space-y-1.5 leading-relaxed">
                              <div>
                                <span className="font-semibold text-[#8B949E]">What it is: </span>
                                <span>{item.what}</span>
                              </div>

                              <div>
                                <span className="font-semibold text-[#8B949E]">How to test:</span>
                                <ul className="list-disc list-inside ml-2 mt-0.5 space-y-0.5 text-[#C9D1D9]">
                                  {item.how.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="pt-0.5">
                                <span className="font-semibold text-[#3FB950]">What you will see: </span>
                                <span className="text-white/90">{item.see}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-[#8B949E] border-t border-[#21262D] pt-6 pb-8">
          <p>CarVibe Dubai • Milestone 4 Final Rollout • Simulation Readiness</p>
          <p className="mt-1">Reviewer: Sir Nyash (Owner) • October 2026</p>
        </div>
      </div>
    </div>
  );
}
