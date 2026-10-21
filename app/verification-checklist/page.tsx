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

const MEETING_CHECKLIST: CheckItem[] = [
  // 1. Display & Formatting
  {
    id: "clean-numbers",
    category: "1. Display & Formatting",
    title: "Remove Currency Labels (AED) from Table Columns",
    what: 'Numbers in tables show clean values only. "AED" text is removed from grid columns and only shown on final totals so reports look neat and export cleanly to Excel.',
    how: [
      "Open Commission or Inventory in the admin dashboard.",
      "Look at the columns showing figures (e.g. Purchase Price, Commission).",
    ],
    see: 'Numbers are clean digits without repetitive "AED" text on every single line. Final totals clearly show "AED".',
  },
  {
    id: "clean-dates",
    category: "1. Display & Formatting",
    title: "Standardize Date Displays",
    what: "Date formats across the system are standardized to a clean, consistent format without confusing text or extra letters.",
    how: [
      "Check dates displayed in Payment History, Inventory, and Leads.",
    ],
    see: "Dates appear clean, uniform, and easy to read across all screens.",
  },

  // 2. Role-Based Search & Privacy
  {
    id: "call-center-search",
    category: "2. Role-Based Search & Security",
    title: "Call Center Search (Phone Number Only)",
    what: "Call Center agents search customers by their mobile number only. Searching by name is blocked to prevent mixing up common UAE names like Mohammed or Ahmed.",
    how: [
      "Log in as Call Center (agent@gmail.com).",
      "Type a customer's name in the top search bar (notice it does not filter).",
      "Enter the customer's mobile number (e.g., 055 or 056).",
    ],
    see: "The exact matching customer appears immediately with zero risk of wrong records.",
  },
  {
    id: "purchaser-privacy",
    category: "2. Role-Based Search & Security",
    title: "Purchaser Search (Name Only & Hidden Phone Numbers)",
    what: "Purchasers can only search by customer name and car details. Customer phone numbers are strictly hidden from purchasers to protect company data.",
    how: [
      "Log in as Purchaser (purchaser@gmail.com).",
      "Search for a customer by name in the top search bar.",
      "Open the customer record.",
    ],
    see: "Customer name and car details are visible, but the customer phone number is hidden/redacted.",
  },

  // 3. Customer Arrival & Mistake Correction
  {
    id: "arrival-phone-verification",
    category: "3. Customer Arrival & Mistake Correction",
    title: "Customer Arrival Mobile Number Verification",
    what: "When a customer arrives at the shop, the agent must enter the customer's registered phone number before marking them as 'Arrived' to guarantee their identity.",
    how: [
      "In Call Center view, open a customer with an Inspection Scheduled status.",
      "Click to confirm Customer Arrived.",
      "Enter the customer's registered mobile number when prompted.",
    ],
    see: "The system confirms arrival only when the number matches, preventing marking the wrong customer.",
  },
  {
    id: "revert-arrival-mistake",
    category: "3. Customer Arrival & Mistake Correction",
    title: "Arrival Status Reversion with Mandatory Reason",
    what: "If an agent accidentally marks the wrong customer as arrived, Super Admin (Sir Nash) can turn it off. Agents can submit a reversal request with a mandatory reason.",
    how: [
      "As Super Admin, open a lead that was marked arrived.",
      "Click to turn off arrival status.",
      "Enter a short reason (e.g., 'Agent selected wrong Mohammed') and save.",
    ],
    see: "The customer reverts back to Inspection Scheduled, and the reason is recorded in the activity log.",
  },
  {
    id: "staff-error-report",
    category: "3. Customer Arrival & Mistake Correction",
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
    category: "3. Customer Arrival & Mistake Correction",
    title: "Purchaser Email Alert on Customer Arrival",
    what: "When a customer is confirmed arrived at the shop, the assigned Purchaser receives an automated email notification so they know the customer is waiting outside.",
    how: [
      "Confirm a customer's arrival in the dashboard.",
    ],
    see: "An automated arrival alert email is triggered for the assigned Purchaser and management inbox.",
  },

  // 4. Vehicle Inspection
  {
    id: "pass-all-inspection",
    category: "4. Vehicle Inspection",
    title: "Inspection Form 'Select All Pass' Button",
    what: "The vehicle inspection form has a 'Pass All Components' button to check all parts at once, saving the inspector 10 minutes of manual clicking.",
    how: [
      "Open a lead as Purchaser and click 'Start Inspection'.",
      "Click the 'Pass All Components' button.",
      "Manually mark any defective item as failed (❌) and attach photos.",
      "Save the inspection and download the report.",
    ],
    see: "All items turn green instantly. Inspector only changes the defective parts and downloads a clean PDF report.",
  },

  // 5. Expenses
  {
    id: "car-expenses-tab",
    category: "5. Expense Tracking",
    title: "Car-Specific Expense Tracking & Summary Tab",
    what: "Operational costs (towing, coffee for customer, washing) are added directly under that vehicle, and a dedicated Expenses tab shows all company expenses.",
    how: [
      "Open a customer record under negotiation or after deal, click 'Add Expense', enter Towing (500 AED) or Coffee (10 AED), and save.",
      "Click Expenses in the sidebar to view the total summary filtered by Day, Week, Month, Year, or All Time.",
    ],
    see: "Expenses attach directly to the car, subtract from gross profit, and appear in the executive Expenses tab with 1-click PDF/Excel export.",
  },

  // 6. Super Admin Access & Control
  {
    id: "super-admin-access",
    category: "6. Super Admin Access & Permissions",
    title: "Unlimited Super Admin System Access",
    what: "Super Admin accounts (Sir Nash) maintain complete, unrestricted access across all screens, financial records, expenses, and staff controls.",
    how: [
      "Log in as Super Admin.",
      "Navigate across all sidebar tabs (Overview, Leads, Scrap Inquiries, Inventory, Expenses, Commission, Staff Management, Settings).",
    ],
    see: "Full access to view, edit, override, and manage all records across the entire system.",
  },
  {
    id: "multi-device-login",
    category: "6. Super Admin Access & Permissions",
    title: "Super Admin Simultaneous Multi-Device Login",
    what: "Company owners can log in to the Super Admin account from multiple devices or browsers at the same time without getting kicked out.",
    how: [
      "Log in to Super Admin on a laptop.",
      "Log in to Super Admin on a second laptop or mobile browser at the same time.",
    ],
    see: "Both sessions stay active simultaneously for administrative oversight.",
  },
];

export default function VerificationChecklistPage() {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("carvibe_nash_meeting_checklist_v2");
      if (saved) setCheckedMap(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function toggleCheck(id: string) {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("carvibe_nash_meeting_checklist_v2", JSON.stringify(next));
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
        localStorage.removeItem("carvibe_nash_meeting_checklist_v2");
      } catch {
        // ignore
      }
    }
  }

  const completedCount = Object.values(checkedMap).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / MEETING_CHECKLIST.length) * 100);

  function copyForGoogleDocs() {
    let text = `# CarVibe Dubai — System Verification Checklist for Sir Nash\n\n`;
    text += `Target: Milestone 4 Go-Live & Simulation Testing\n`;
    text += `Basis: October 18, 2026 Strategy Meeting Action Items\n\n`;
    text += `Progress: ${completedCount} of ${MEETING_CHECKLIST.length} Completed (${progressPercent}%)\n\n`;
    text += `---\n\n`;

    let currentCategory = "";
    for (const item of MEETING_CHECKLIST) {
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
  const categories = Array.from(new Set(MEETING_CHECKLIST.map((item) => item.category)));

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#F0F6FC] px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="rounded-xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#161B22] to-[#0D1117] p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-3 py-1 text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Meeting Action Items Verification
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                CarVibe Dubai Verification Checklist
              </h1>
              <p className="text-sm text-[#8B949E] mt-1">
                Prepared for Sir Nash • Based strictly on the October 18, 2026 Meeting Action Items
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
            Welcome, Sir Nash! This checklist contains the <b>12 exact tasks</b> agreed upon in our October 18 meeting.
            Nothing extra has been added. Simply follow the short steps for each feature, observe the result, and tick the verification box.
          </p>

          {/* Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#8B949E]">Simulation Progress</span>
              <span className="text-[#D4AF37] font-semibold">
                {completedCount} of {MEETING_CHECKLIST.length} Verified ({progressPercent}%)
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black hover:bg-[#E6C65C] transition shadow-md cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied to Clipboard!" : "Copy Clean Text for Google Docs"}
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#30363D] bg-[#21262D] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#30363D] transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#8B949E]" />
              Print / Save PDF
            </button>

            {completedCount > 0 && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-[#8B949E] hover:text-[#F85149] transition ml-auto cursor-pointer"
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
            const categoryItems = MEETING_CHECKLIST.filter((i) => i.category === category);
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
          <p>CarVibe Dubai • Milestone 4 Final Rollout • Meeting Action Items Verification</p>
          <p className="mt-1">Reviewer: Sir Nyash (Owner) • October 2026</p>
        </div>
      </div>
    </div>
  );
}
