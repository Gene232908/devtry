# TASKS.md

- [x] 2026-10-22 Admin Tables & Commission Currency Label Cleanup (`components/admin/InventoryTable.tsx`, `components/admin/MobileInventoryList.tsx`, `app/(admin)/admin/commission/commission-client.tsx`, `components/admin/leads-table/index.tsx`, `components/admin/leads-table/row.tsx`):
  - Removed redundant "AED" currency prefixes across Inventory and Commission tables, ensuring row values display clean digits only (`formatNumber`), while moving the currency indicator into column headers (`(AED)`).
  - Updated `InventoryTable.tsx`: Headers now specify `Paid (AED)`, `Paid amount (AED)`, `Expenses (AED)`, `Net profit (AED)`, `Call Centre (AED)`, `Purchaser (AED)`, `Developer (AED)`; table cells format numbers via `formatNumber`.
  - Updated `MobileInventoryList.tsx`: Formatted numeric metrics with `formatNumber`.
  - Updated `commission-client.tsx`: Cleaned Payout Summary breakdown to numeric values; added `(AED)` to Developer monthly breakdown summary and formatted monthly items as clean numbers.
  - Updated `leads-table`: Header now specifies `Est. Value (AED)` and row values use `formatNumber`.
  - Verified with Vitest unit tests (314 passed), TypeScript (`npx tsc --noEmit`), and ESLint (`npm run lint`) (all 0 errors/warnings). Pushed to `devtry` on branch `final`.


- [x] 2026-10-21 Sir Nash System Verification Checklist & Online Live Guide (`app/verification-checklist/page.tsx`, `docs/client/Sir_Nash_Verification_Checklist.md`, `.docx`, `.html`, `scripts/generate_verification_checklist_docx.mjs`):
  - Extracted and structured all 14 operational requirements from the Oct 18, 2026 Strategy Meeting into a simplified, non-technical, plain-English verification checklist.
  - Built an interactive, responsive online checklist page at `app/verification-checklist/page.tsx` (`http://localhost:3000/verification-checklist`) with live progress tracker, persistent checkboxes via `localStorage`, 1-click "Copy for Google Docs", and "Print / Save PDF".
  - Generated Word `.docx` (`docs/client/Sir_Nash_Verification_Checklist.docx`) and standalone `.html` via `scripts/generate_verification_checklist_docx.mjs` for seamless offline sharing and direct Google Drive upload.
  - Verified across desktop and mobile viewports via browser subagent. Passed all TypeScript checks and tests.

- [x] 2026-10-21 Staff Management Editable Email, Password & Super Admin Role (`lib/admin/staff-schema.ts`, `app/api/admin/staff/[id]/route.ts`, `app/api/admin/staff/route.ts`, `components/admin/StaffAccounts.tsx`, `lib/admin/staff-schema.test.ts`):
  - Enabled Super Admins to edit Email, Password (reset/update credentials), and Role for staff and owner accounts directly from Staff Management.
  - Updated `lib/admin/staff-schema.ts` to include `admin` (Super Admin) in `ASSIGNABLE_ROLE_VALUES`, allowing Super Admin assignment, and expanded `staffPatchSchema` to accept optional `email` and optional `password` (>= 6 chars or blank).
  - Updated `PATCH /api/admin/staff/[id]` to update Supabase Auth user credentials (`email`, `password`, `user_metadata`) via `supabase.auth.admin.updateUserById()` and sync `public.profiles` (`email`, `display_name`, `role`, `is_active`).
  - Added pre-flight duplicate email collision check in `PATCH /api/admin/staff/[id]` returning clear 409 error ("An account with that email address already exists.") instead of raw Supabase Auth `{}` empty object error.
  - Conditioned Auth email update to only trigger when the email actually changes, preventing redundant Auth re-confirmations.
  - Hardened last-owner protection in `PATCH /api/admin/staff/[id]` to prevent demoting or disabling the last active owner (`would_remove_last_owner`).
  - Updated `POST /api/admin/staff` to support provisioning new Super Admin accounts directly.
  - Updated `StaffAccounts.tsx` to keep email field editable, show optional password input on edit, include Super Admin in role select, display edit controls for owner accounts with self-disable safeguards and `(You)` badge, and sanitize error banners.
  - Added unit test suite in `lib/admin/staff-schema.test.ts` (100% passing across 41 test suites, 314 tests) and verified visually with browser subagent.

- [x] 2026-10-21 Customer Service Number Blocking Activation (`lib/auth/permissions.ts`, `app/api/admin/blocked-numbers/route.ts`, `app/api/admin/blocked-numbers/route.test.ts`):
  - Enabled the number blocking system for the Customer Service (`call_center`) role by granting the `manageBlocklist` capability in `lib/auth/permissions.ts`.
  - Updated `POST` and `DELETE` endpoints in `app/api/admin/blocked-numbers/route.ts` to authorize staff with `manageBlocklist` (Super Admin, Owner, and Customer Service) instead of hardcoding `requireAdmin()`.
  - Verified Customer Service can successfully block numbers from Lead Detail (`MarkSpamAction`), Incomplete Forms (`PartialLeadDetail` and `incomplete-client`), and unblock if needed.
  - Added dedicated unit test coverage in `app/api/admin/blocked-numbers/route.test.ts` and updated `lib/auth/permissions.test.ts` (100% passing across 40 test suites, 306 tests).
- [x] 2026-10-21 Inventory Typography Balance & Removal of "Unverified Number" Badges (`components/admin/InventoryTable.tsx`, `components/admin/MobileInventoryList.tsx`):
  - Removed misleading "Unverified number" warning badges from the inventory table and mobile list, adhering to the temporary public WhatsApp OTP bypass where OTP is paused.
  - Balanced and enlarged font sizes across `InventoryTable` from tiny `text-fluid--1` to readable, proportional `text-xs sm:text-sm` typography with clear vehicle links, prominent tabular numbers, and consistent header styling.
  - Verified across desktop viewports via browser subagent, passed all 39 test suites (301 tests) and TypeScript typecheck with 0 errors.
- [x] 2026-10-21 Vehicle Expenses Pagination, Simplified Single KPI Card, Time Period Filtering & Itemized Breakdown Modal (`app/(admin)/admin/expenses/expenses-client.tsx`, `lib/admin/expenses.ts`, `lib/admin/expenses.test.ts`):
  - Added table pagination capped at 10 items per page with responsive page numbers, previous/next controls, and dynamic entry range indicators.
  - Eliminated wide empty space by replacing the standalone 1/3 card with an integrated Executive Total Widget in the page header adjacent to action controls, paired with a dedicated high-contrast `<tfoot>` ledger row directly under the Amount column in the data table and a compact mobile summary strip.
  - Removed category filter chips per user request and replaced them with Day, Weekly, Monthly (default), Yearly, and All Time period filtering computed in UAE timezone; converted time period filter from segmented buttons into a styled dropdown select matching the admin dark theme with custom chevron.
  - Replaced the "Description" column with an "Action" column featuring a "View Breakdown" eye button that opens a dedicated modal displaying all itemized expenses for that vehicle, individual amounts, and a prominent Total Vehicle Expenses summary.
  - Made the vehicle name itself a direct clickable hyperlink to the customer record (`/admin/leads/[id]`) and eliminated the separate "View" link.
  - Consolidated export controls into a single unified "Export" button with a sleek dropdown for PDF Document (.pdf) and Excel Spreadsheet (.csv).
  - Implemented balanced, high-precision vector PDF generation via `pdf-lib` in `lib/admin/expenses.ts` (`downloadExpensesPdf` / `generateExpensesPdfBlob`) rendering clean table data only (no window.print, browser tab, or UI chrome), complete with executive gold header banner, exact column alignments, zebra striping, and multi-page support.
  - Stripped out all cluttered header metadata (`Generated: ...`, `Aggregated vehicle operational costs...`, `Total Filtered: ...`), making the PDF layout strictly minimal, executive, and readable with 8.5 pt high-contrast typography and 8 pt cell padding.
  - Verified across viewports in browser subagent, vitest (39 suites, 302 tests passing), and production build check.
- [x] 2026-10-21 Preserve Customer Service Account in Staff Error & Arrival Reversals (`app/api/leads/[id]/route.ts`, `app/api/admin/staff-errors/route.ts`, `components/admin/LeadArrivalCard.tsx`, `components/admin/LeadDetail.tsx`, `lib/admin/leads-store.tsx`, `lib/admin/staff-errors.test.ts`):
  - Fixed issue where reversing customer arrival wiped the original Customer Service agent's record from audit reports by preserving `original_arrived_by` and `original_arrived_at` in `arrival_reverted` event metadata before clearing `leads.arrived_by`.
  - Updated `GET /api/admin/staff-errors` to accurately resolve `STAFF MEMBER` to the Customer Service agent who checked in the customer, while attributing `STATUS & RESOLUTION` to Sir Nash (Super Admin) as the approver who cleared the mistake.
  - Added server-side tracking for Customer Service arrival reversal requests (`arrival_reversal_requested`), marking them as `Pending Sir Nash Approval` in the audit report.
  - Added optional reversal note/reason input in Super Admin turn-off modal so reasons are recorded in the audit trail.
  - Added unit test coverage in `lib/admin/staff-errors.test.ts` and verified with browser subagent.
  - Organized `/admin/staff` into clean, switchable tabs: "Staff Accounts & Directory" (account creation, role assignment, status toggling) and "Staff Error & Reversal Report" (audit view tracking mistake footprint and arrival reversals).
  - Eliminated all synthetic/mock seed data (`BASE_STAFF_ERRORS`); API queries strictly real `lead_events` (`arrival_reverted`, `staff_error`) from Supabase.
  - Resolved accurate customer name from `leads.full_name` (e.g. `gene`) and accurate car details (`2026 Avatr Avatr 11`), eliminating fallback placeholders ("Customer", "Vehicle").
  - Resolved actor and approver names from `profiles.display_name` and `profiles.role` (e.g. `Developer (test) (Super Admin)`), eliminating raw UUID strings.
  - Converted "Staff Reversal Frequency" from heavy 2-column cards into a high-performance tabular list with dedicated staff search, ranked rows (#), circular avatars, role badges, reversal counts, monthly counts, UAE timestamps, relative impact gradient bars, and active filter toggling.
  - Added fast, memoized pagination capped at maximum 10 items per page with responsive page controls for both the Staff Frequency list and the Incident Records table.
  - Unit tests in `lib/admin/staff-errors.test.ts` (100% passing). Verified in browser with subagent: 0 lint warnings, 0 typecheck errors, 299/299 tests passing.
- [x] 2026-10-21 Complete Removal of "UAE" Suffix from Staff Payment History (`lib/uae-time.ts`, `components/admin/StaffPaymentHistory.tsx`):
  - Hardened `formatUaeDateTime()` in `lib/uae-time.ts` to sanitize and unconditionally strip any incoming or outgoing trailing `UAE` string.
  - Added dedicated `formatPaymentDate()` sanitizer in `components/admin/StaffPaymentHistory.tsx` ensuring payment dates render cleanly without `UAE` (e.g. `Paid 20 Oct 2026, 22:29`, `Paid 09 Oct 2026, 17:22`).
  - Confirmed `Expenses` navigation link is active and visible between `Inventory` and `Commission` in the admin sidebar.
  - Verified in browser subagent, passed all 38 test suites (294 tests) and TypeScript typecheck with 0 errors.
- [x] 2026-10-20 Expenses Summary Tab & Monthly Overview in Admin Sidebar (`lib/admin/expenses.ts`, `app/api/admin/expenses/route.ts`, `app/(admin)/admin/expenses/page.tsx`, `app/(admin)/admin/expenses/expenses-client.tsx`, `components/admin/Sidebar.tsx`, `lib/admin/expenses.test.ts`):
  - Created dedicated Expenses Summary Tab under `/admin/expenses`, accessible to Super Admin, Manager, and Purchaser via `viewInventory` capability.
  - Streamlined executive KPI cards into a clean 2-card overview: "This Month's Expenses" (filtered for the active calendar month in UAE timezone, e.g. October 2026) and "All-Time Total Expenses", eliminating visual clutter and statistical overwhelm.
  - Implemented dynamic search (car make/model/chassis, description, staff name), origin tabs (All Origins, Valuation, Scrap), category filter chips (Towing & Recovery, RTA & Inspection, Detailing & Wash, Repairs & Maintenance), and sorting controls.
  - Added one-click CSV export generating formatted expense logs (`CarVibe_Expenses_Summary_YYYY-MM-DD.csv`).
  - Added unit test suite in `lib/admin/expenses.test.ts` verifying calculation accuracy, monthly summaries, and CSV output.
  - Verified across desktop and mobile in browser subagent, passed ESLint (0 errors, 0 warnings), all 38 test suites (294 tests), and TypeScript typecheck.
- [x] 2026-10-20 Customer Arrival Email Dispatch to Registered Purchaser & Super Admin (`lib/server/lead-notifications.ts`, `app/api/leads/[id]/route.ts`, `lib/server/lead-notifications.test.ts`):
  - Implemented automated customer arrival email notification: when Customer Service confirms arrival via mobile number verification, system queries `profiles` for the assigned purchaser's registered account email (e.g. `genemathew232@gmail.com`).
  - Dispatches branded HTML and plain-text arrival notification to the purchaser's registered email AND to Sir Nash at `carvibe@cresvcs.com`.
  - Added unit test assertions covering arrival email text and HTML format.
- [x] 2026-10-20 Comprehensive Operational User Manual & Training Guide in Word .docx (`docs/client/CarVibe_User_Manual_and_Training_Guide.docx`, `.html`, `.md`, `scripts/generate_user_manual_docx.mjs`):
  - Drafted complete, executive-ready User Manual covering role boundaries, security matrix, 20-step lifecycle, and dry-run testing checklist for Call Center, Purchaser, and Super Admin.
  - Generated native Microsoft Word `.docx` file using `docx` library with styled cover header, metadata grid, color-coded permission tables, numbered step cards, and 10-point simulation checklist for Sir Nyash.
- [x] 2026-10-20 Remove UAE Suffix from Payment History Timestamps (`lib/uae-time.ts`, `components/admin/StaffPaymentHistory.tsx`):
  - Removed " UAE" string suffix from `formatUaeDateTime()` so audit timestamps across payment history lists and receipts render clean date/times (e.g. `Paid 09 Oct 2026, 17:22`, `Paid 27 Sept 2026, 19:02`).
  - Removed redundant "Times are UAE." helper text from Recent Payments and Payment History modal headers.
  - Verified: `npx tsc --noEmit` (0 errors), `npm test` (37 suites, 290 tests passing).
- [x] 2026-10-20 Role-Based Search Filters & Inspection Form Fast-Track Pass All (`lib/admin/use-leads-filter.ts`, `components/admin/leads-table/toolbar.tsx`, `app/(admin)/admin/incomplete/incomplete-client.tsx`, `components/admin/InspectionWorkspace.tsx`):
  - Implemented role-based search filtering across Leads Directory, Scrap Inquiries, and Incomplete Forms:
    - Customer Service (`call_center`): Strictly searches by phone number only (case-insensitive and format-tolerant for UAE local `05x`, international `971`, spaces, and dashes). Does not match customer names. Placeholder: `"Search by phone number…"`.
    - Purchaser (`purchaser`): Strictly searches by customer name only (case-insensitive). Does not match phone numbers. Placeholder: `"Search by customer name…"`.
    - Super Admin / Manager (`admin`, `manager`): Searches both customer name and phone number. Placeholder: `"Search name or phone…"`.
  - Added "Pass All Components" / "Select All (Pass)" capability to the Inspection Workspace (`/admin/leads/[id]/inspection`):
    - Added global "Pass All Components" quick-action banner above the checklist to mark all external body, mechanical, and tyre items as passed in one click.
    - Added per-section "Select All (Pass)" buttons for External Body Condition, Mechanical Components, and Tyres, enabling inspectors to batch-pass and then manually toggle defects ('X' / fail) on specific damaged items.
  - Added unit test suite in `lib/admin/use-leads-filter.test.ts` covering all role-based search rules and phone format variations.
- [x] 2026-10-20 Staff Invoice / Payment Receipt PDF Layout & Spacing Balance (`lib/admin/pdf-invoice.ts`, `lib/admin/pdf-invoice.test.ts`):
  - Removed "AED" from `Payment Status:` label so it cleanly displays `Payment Status: PAID` (or `UNPAID / OUTSTANDING`) without redundant currency prefix on status values.
  - Resolved text collision and tight spacing around the gray summary box: positioned metadata rows at Y=705, 688, 671, 654 with consistent line heights, set gray summary box from Y=594..630 providing 24pt top breathing room, balanced internal vertical text centering (Y=607), and spaced black table header at Y=552..574 (20pt gap) for both paid and unpaid invoices.
  - Added unit test assertions ensuring `Payment Status:` does not contain "AED".
- [x] 2026-10-20 Super Admin Arrival Turn-Off / Reversal Fix (`app/api/leads/[id]/route.ts`, `components/admin/LeadDetail.tsx`, `components/admin/LeadArrivalCard.tsx`):
  - Fixed Super Admin direct arrival turn-off in `PATCH /api/leads/[id]`: allowed `arrival_status: "not_arrived"` for admin and manager roles, clearing `arrived_at` and `arrived_by` and recording `arrival_reverted` audit event in `lead_events`.
  - Returned Promise from `onConfirmArrival` and `onRevertArrival` in `LeadDetail.tsx` so asynchronous arrival updates are properly awaited by `LeadArrivalCard.tsx` before closing modals.
  - Verified in browser with subagent: Super Admin clicking toggle, confirming turn-off in modal, correctly reverts arrival status to "Not yet arrived" (grey toggle) and persists on refresh.
- [x] 2026-10-19 Payment History & Commission AED Redundancy Cleanup and Customer Arrival Phone Verification & Reversal Approval Workflow (`components/admin/StaffPaymentHistory.tsx`, `app/(admin)/admin/commission/commission-client.tsx`, `lib/admin/pdf-invoice.ts`, `components/admin/LeadArrivalCard.tsx`, `components/admin/LeadDetail.tsx`):
  - Changed Payment History modal title and section headers to "Payment History (AED)" / "Payment history (AED)".
  - Removed redundant inline "AED " prefixes from numeric table cells, summary cards, and payment history lists so that values render as clean numbers (e.g. 15,000, 520, 4,480, 89.60).
  - Updated PDF invoice generator to use "Payment Status: AED" and cleaned row table numbers.
  - Implemented phone number verification modal when toggling Customer Arrived: requires entering the customer's phone number to verify legitimacy before marking as arrived; blocks arrival if the entered number does not match.
  - Implemented arrival reversal workflow: if Customer Service attempts to toggle off arrival, a reason input modal prompts for explanation and sends the request to Sir Nash (Super Admin) as pending; Sir Nash reviews the submitted reason and can approve or decline the reversal.
- [x] 2026-10-18 Isolated Leads Directory vs Scrap Inquiries filter state and fixed Sidebar active indicator on Customer Records (`components/admin/leads-table/index.tsx`, `lib/admin/use-leads-filter.ts`, `components/admin/Sidebar.tsx`, `components/admin/leads-table/row.tsx`, `components/admin/leads-table/mobile-list.tsx`):
  - Solved cross-scope filter bleed between Leads (`/admin/leads`) and Scrap Inquiries (`/admin/leads?origin=scrap`) by keying the table component with `key={sessionScope}` and synchronizing `useLeadsFilter` on storage key changes to prevent stale scope state overwrite.
  - Selecting, changing, or clearing filters in Leads has zero impact on Scrap Inquiries filters, and vice-versa.
  - Fixed sidebar active state when viewing customer records under Leads (`/admin/leads/[id]`) and Scrap Inquiries (`/admin/leads/[id]?origin=scrap`): regular customer records keep "Leads" highlighted, and scrap inquiry records keep "Scrap Inquiries" highlighted.
  - Updated desktop and mobile row links to explicitly pass `?origin=scrap` on scrap leads so customer record navigation immediately retains scrap context.
- [x] 2026-10-18 Filter State Session Persistence across Leads, Scrap Inquiries, and Incomplete Forms (`lib/admin/use-leads-filter.ts`, `components/admin/leads-table/index.tsx`, `components/admin/LeadDetail.tsx`, `app/(admin)/admin/incomplete/incomplete-client.tsx`):
  - Added role-and-scope-aware `sessionStorage` persistence to `useLeadsFilter` so that selected filters (search, statuses, makes, emirates, arrival statuses, page) remain active when navigating to inspect a customer record (`/admin/leads/[id]`) and returning, or on browser refresh/hard refresh.
  - Linked "Clear filters" button to reset all selections (including search input) and clear stored session filters with one click.
  - Updated `LeadDetail` breadcrumb back link to accurately return to `/admin/leads?origin=scrap` when viewing a scrap inquiry and `/admin/leads` for standard leads.
  - Added `sessionStorage` persistence to Incomplete Forms tab filter (`All`, `Valuations`, `Scrap Inquiries`) so that inspecting an incomplete record and returning to `/admin/incomplete` preserves the chosen tab instead of resetting to default.
- [x] 2026-10-18 Dynamic Vehicle Catalog Makes Filter for Leads & Scrap Inquiries tabs across all roles (`lib/use-vehicle-catalog.ts`, `components/admin/leads-table/toolbar.tsx`, `components/admin/leads-table/index.tsx`, `components/ui/MultiSelect.tsx`, `lib/admin/use-leads-filter.ts`):
  - Upgraded `useVehicleCatalog` to expose all active/unarchived catalog makes dynamically from the database (`/api/vehicles`).
  - Replaced the hardcoded static 10-make configuration in `LeadsToolbar` with live Vehicle Catalog makes combined with current leads data, sorted alphabetically (e.g. 212, Abarth, Acura, AION, Aito, Alfa Romeo, Arcfox, Aston Martin, Audi, Avatr, BAIC, Bestune, etc.).
  - Added an inline search filter to `MultiSelect` when options exceed 5, making it effortless to search and filter across large brand lists.
  - Hardened make matching in `use-leads-filter.ts` to be trimmed and case-insensitive.
  - Verified across Super Admin, Purchaser, and Customer Service roles in both Leads (`/admin/leads`) and Scrap Inquiries (`/admin/leads?origin=scrap`) tabs.
- [x] 2026-10-18 Removed "Margin" field from Commission Details modal (`app/(admin)/admin/commission/commission-client.tsx`):
  - Removed Margin from the mobile card view and desktop Closed Car Sales table headers/rows inside the Staff Details modal per user request.
  - Kept all core financial metrics (`Paid amount`, `Expenses`, `Net profit`, `Profit`, `Commission`) 100% operational, accurate, and intact.
- [x] 2026-10-16 Removed notification bell from Topbar navbar (`components/admin/Topbar.tsx`): removed `InspectionNotificationBell` element and import, cleaning up the header navigation for Super Admin and Purchaser roles without affecting lead creation, profile menu, or routing.
- [x] 2026-10-16 Fixed Vercel build failure in `nextFontGoogleFontLoader` (`app/fonts.ts`): removed redundant static `weight` arrays from variable fonts `Manrope` and `Sora`, eliminating 10 parallel HTTP requests to Google Fonts API in `Promise.all` that caused Vercel CI timeouts/failures, accelerating compilation from 40s to 9.6s.
- [x] 2026-10-16 Removed "CarVibe Live" status indicator footer from Admin Sidebar (`components/admin/Sidebar.tsx`): cleaned up bottom status strip containing the green pulsing dot, "CarVibe Live" label, and "UAE" badge per user request, preserving all navigation links, unviewed counter badges, and capabilities.
- [x] 2026-10-16 Removed "Margin" column from Super Admin Staff Commissions table (`app/(admin)/admin/commission/commission-client.tsx`): removed the Margin header and data cell while preserving all underlying financial metrics (Paid amount, Expenses, Net profit, Commission), rebalanced table column widths to 100%, and verified that settlement, invoices, and the Details modal remain 100% operational.
- [x] 2026-10-12 Implemented granular cookie consent system on CarVibe Dubai landing page (`lib/cookie-consent.ts`, `components/public/CookieConsent*`): added luxury dark-themed Cookie & Privacy Notice banner with required acknowledgment message and link to `/privacy`; provided equally accessible "Accept All", "Reject Optional", and "Customize Preferences" actions; built customization modal with Necessary (locked), Analytics (optional), and Marketing (optional) categories; connected Meta Pixel and PageViewTracker so trackers remain strictly dormant until explicit consent; persisted preferences in localStorage with versioning (v1.0) and timestamp to avoid banner flicker on reload; added "Cookie Preferences" link in footer nav.
- [x] 2026-10-11 Added unviewed counter badge on Admin Sidebar for Incomplete Forms and row-level visual indicators in Incomplete Forms directory (`/admin/incomplete`): added amber counter pill badge to Sidebar for `/admin/incomplete` when unviewed/new count > 0; added live count API `/api/admin/incomplete/count` and route-change revalidation; implemented role-scoped session tracking (`lib/admin/viewed-partial-leads.ts`) so Customer Service inspecting a lead does not clear Super Admin's notification badge; removed `viewed_at` from `PARTIAL_LEAD_COLUMNS` to ensure `inquiry_type` is never stripped, preserving accurate "Incomplete Scrap Inquiry" vs "Incomplete Valuation" detection across cards, conversion, and inspection forms.
- [x] 2026-10-10 Modernized and enhanced Admin Sidebar navigation (`Sidebar.tsx`, `AdminShell.tsx`): organized routes into 3 clear semantic groups ("Main Workflow", "Finance & Team", "System & Tools"), replaced duplicate car icons with distinct intuitive symbols (Recycle for Scrap, CarFront for Inventory, Database for Vehicle Catalog), added glowing left active indicators and a distinctive "Scrap" micro-badge, made desktop sidebar sticky (`sticky top-16 h-[calc(100vh-4rem)]`) with zero UI overlap, and optimized mobile drawer UX with backdrop blur and header close action.
- [x] 2026-10-10 Removed redundant and asymmetrical "Scrap Sales" horizontal strip from Super Admin Executive Dashboard (`ExecutiveDashboard.tsx`): consolidated sales reporting into the top KPI cards and unified multi-stream pipeline charts, eliminating UI confusion and keeping the executive view clean, symmetric, and focused.
- [x] 2026-10-10 Simplified and clarified Super Admin Executive Dashboard top KPI financial cards (`ExecutiveDashboard.tsx`, `ExecutiveKpiCard.tsx`): added explicit `Overall (Regular + Scrap)` sub-indicators under Revenue, Gross Profit, and Staff Commission, plus an explicit breakdown under Cars Sold (`{regular} regular · {scrap} scrap`), eliminating any ambiguity regarding multi-stream company sales.
- [x] 2026-10-10 Added Scrap Inquiries alongside Leads in the Website Visitors "Conversion Rate" card for Today/Single-Day view (`VisitorsChart.tsx`): displays breakdown in both the central indicator (`{regular} regular · {scrap} scrap`) and the footer ratio (`{leads} leads · {scrap} scrap inquiries from {visitors} visitors`), ensuring total visibility for daily conversion tracking.
- [x] 2026-10-10 Aligned "Lead Journey" conversion funnel chart stage names (`ExecutiveCharts.tsx`, `executive-overview.ts`) to exactly match customer record status dropdown selections (`STATUS_LABEL`): updated "Inspection booked" → "Inspection Scheduled", "Deals" → "Deal", "Regular leads" → "Regular Leads", and "Scrap inquiries" → "Scrap Inquiries". Expanded Y-axis width (142px) to keep all labels clean and single-line without awkward text wrapping.
- [x] 2026-10-10 Added Scrap Inquiries submission tracking to the Super Admin "Lead Journey" conversion funnel chart (`ExecutiveCharts.tsx`, `executive-overview.ts`): clearly distinguishes "Regular Leads" (Blue) and "Scrap Inquiries" (Indigo) directly beneath Visitors across all dashboard periods (Today, This Week, This Month, All Time, Custom), eliminating ambiguity while preserving clean chromatic conversion flow.
- [x] 2026-10-10 Added clean dropdown filter (All Submissions [default], Regular Leads, Scrap Inquiries) to "Car Submissions" Bar Chart (`SubmissionsChart.tsx`): preserves 100% of the sleek amber-gradient bar aesthetics while allowing Super Admin to isolate regular leads or scrap inquiries at will.
- [x] 2026-10-10 Restored clean, premium amber-gradient styling to "Car Submissions" Bar Chart (`SubmissionsChart.tsx`): removed split bars, filter buttons, and floating legends; integrated clean and subtle daily hover tooltips detailing exact valuation vs scrap counts without any UI clutter.
- [x] 2026-10-10 Made Scrap Inquiry form submissions clearly visible and interactive in the Super Admin Executive Dashboard "Car Submissions" panel (`SubmissionsChart.tsx`, `executive-overview.ts`, `queries.ts`): separated Valuation Requests and Scrap Inquiries counts with functional drill-down links to their respective Leads Directory views (`/admin/leads` and `/admin/leads?origin=scrap`).
- [x] 2026-10-10 Simplified Staff Performance display on Super Admin Executive Dashboard (`ExecutiveDashboard.tsx`, `ExecutivePanels.tsx`): removed the wide Bar Chart and upgraded the "Staff Results" table with role filter tabs (All, Call Centre, Purchasers) and a staff search input to cleanly support teams of any size.
- [x] 2026-10-10 Removed unused inventory stock metrics and aging chart from Super Admin Executive Dashboard (`ExecutiveDashboard.tsx`): removed "Money in Cars for Sale", "Average Time in Stock", "Cars Waiting Too Long" cards, and the "Time Cars Have Been in Stock" chart.
- [x] 2026-10-10 Restricted Super Admin Dashboard Lead Pipeline panel (`executive-overview.ts`, `ExecutivePanels.tsx`) to count exclusively regular valuation leads (`inquiry_type !== 'scrap'`), excluding scrap inquiries from all pipeline stages so counts match the standard Leads Directory filter.
- [x] 2026-10-10 Enhanced Super Admin Dashboard Lead Pipeline panel (`ExecutivePanels.tsx`, `executive-overview.ts`) to be action/activity-based across all pipeline stages by counting leads created in or transitioned into each stage via status changes during the period.
- [x] 2026-10-10 Added "Not Purchased" (`closed` status) to the Super Admin Dashboard Lead Pipeline panel (`ExecutivePanels.tsx`, `executive-overview.ts`), and enabled "Not Purchased" filtering and selection in the Leads Directory (`format.ts`).
- [x] 2026-10-10 Aligned Dashboard Scrap Overview metric label from "Sold for" to "Paid amount", and harmonized related admin UI labels across Mobile Inventory List, Commission views, and report exports to match the Inventory table naming convention ("Sold date", "Paid", "Paid amount").
- [x] 2026-10-10 Updated the Inspection Form accessed through the Scrap Inquiry tab to contain exactly the 10 approved inspection items in the required order (Front of car, Full left side, Full right side, Rear of car, Bonnet, Roof, Dashboard and mileage, Front seats, Rear seats, Engine bay). Removed all other inspection checklist items from the Scrap Inspection Form while preserving Valuation Inspection Form 100% unchanged. Updated progress, completion counts, and server submission validation to reflect exactly 10 items.
- [x] 2026-10-10 Made Trim optional in both Valuation and Scrap Inquiry public landing page forms (`lead.schema.ts`, `step-trim-location.tsx`, `app/api/leads/route.ts`). Users can submit without choosing a Trim while Location and Option Level remain mandatory.
- [x] 2026-10-10 Resolved photo upload failure without notes by relaxing database constraints (migration `0043_optional_inspection_photo_notes.sql`) and adding seamless backend fallback so uploads succeed on both current and unmigrated databases.
- [x] 2026-10-09 Updated the inspection photo workflow for Valuation and Scrap inquiries: users can capture or upload photos immediately with phone camera or file upload without a prerequisite note. Notes remain optional for parts in good condition and are used to document dents, scratches, or defects.
- [x] 2026-10-01 Fixed Purchaser My Commission financial columns showing AED 0 despite linked sold Inventory values. Purchasers now receive Sold for, Expenses, Net profit, and Margin only for their own server-scoped commission entries; Call Centre profit remains redacted.

- [x] 2026-10-01 Made Vehicle Specification conversion-only in Incomplete Forms: it stays hidden for New/Contacted records and appears with the required vehicle fields only after selecting Inspection Scheduled; hidden values are not persisted by an ordinary follow-up save.

- [x] 2026-10-01 Fixed converted incomplete forms disappearing from the admin workflow: the live Leads store now reloads before opening the converted record, manual refresh can recover from an earlier fallback, and Customer Service no longer defaults to a New-only filter that hid converted Inspection Scheduled regular and Scrap leads.

- [x] 2026-10-01 Replaced the 700 ms incomplete-form autosave with a five-second stable-input delay and added session/revision idempotency for both Valuation and Scrap. Migration `0041_partial_lead_capture_sessions.sql` is tracked but must be applied before full preview verification.

- [x] 2026-10-01 Added automated incomplete-form retention: unconverted records with no activity for 30 days are archived, records inactive for 90 days are deleted in bounded daily batches, converted records are excluded, and returning customers automatically reactivate the existing capture. Migration `0040_partial_lead_retention.sql` was applied and verified on the production Supabase project; application code is pushed to the protected `almostdone` preview branch.

- [x] 2026-10-01 Hardened incomplete valuation/scrap capture for X, backdrop, Escape, checkbox, tab close, Alt+F4, navigation, and browser/device exit. Exit saves use `sendBeacon` with a keepalive fallback, maintain a synchronous latest-values snapshot to prevent type-then-close races, and show invalid UAE phone formatting on blur instead of failing silently.

- [x] 2026-10-01 Added a pan-and-zoom inspection photo viewer: zoom in, zoom out, reset, mouse-wheel zoom, and drag-to-inspect a specific area. Photo navigation remains available and resets the view between photos.

- [x] 2026-10-01 Inspection photos are compressed in the browser to JPEG files under 1 MB before upload, with a server-side 1 MB enforcement as a second storage guard. The upload progress now shows compression, upload, and secure-save stages.

- [x] 2026-09-28 Added Meta standard browser events for public CTA interactions: `Lead` for valuation/scrap actions and successful submissions, and `Contact` for Call Now/Message Us actions. Events are best-effort, carry only a button/content label, and never block the user flow. Verify on the `almostdone` Preview in Meta Test Events after deployment.

- [x] 2026-09-28 Added the new CarVibe Dubai Web Meta Pixel (`2123934174864799`) as an environment-controlled base `PageView` integration. No personal form data, advanced matching, or Conversions API is enabled yet.

- [x] 2026-09-27 Inspection rescheduling now resets a previously confirmed customer arrival for both Regular and Scrap leads. The server clears the arrival actor/timestamp only when the appointment time genuinely changes, records the reschedule and reset in Activity, and keeps inspection locked until Call Centre confirms arrival for the new UAE appointment.

- [x] 2026-09-27 Purchasers can now record an assigned Scrap Inquiry as Deal after inspection, using the same price validation and atomic Inventory creation as a Regular lead. Scrap provenance remains immutable.

- [x] 2026-09-27 Payment-history PDF invoices: every Super Admin payment-history record now has a downloadable immutable payment invoice with the frozen amount, UAE payment timestamp, confirmer, receipt ID, and included sale commissions. The download remains available after the outstanding balance becomes zero.

- [x] 2026-09-27 Payment History now shows each short Receipt ID with a copy action. When two or more records exist, a responsive search matches receipt ID, UAE date, staff confirmer, customer, car, or amount.

- [x] 2026-09-27 Recent Payments on the Super Admin Commission page is now a compact text list of the latest three payouts. Remaining records open in a scrollable, mobile-friendly Payment History modal instead of filling the page with cards.

- [x] 2026-09-27 Developer Share now uses a pay-anytime workflow: Super Admin can settle all currently unpaid monthly developer statements with one clearly labelled payment action. Calendar quarters are no longer the payment control; monthly accounting details are optional and collapsed.

- [x] 2026-09-27 Added a safe Developer Share demo seed. It creates two clearly labelled September 2026 sold cars with AED 630 total developer share, plus matching Call Centre/Purchaser entries and confirmed expense records. It refuses duplicate demo creation.

- [x] 2026-09-27 Commission Staff grid financial columns: Super Admin now always sees Sold for, Expenses, Net profit, and Margin beside each staff account, including zero/past-paid rows. The grid remains horizontally scrollable on narrow screens with rebalanced desktop widths.

- [x] 2026-09-27 Temporary public WhatsApp OTP pause implemented locally for Free Valuation and Scrap Inquiry. Server mode defaults to `unverified`; direct submissions persist as `phone_verified=false` using existing lead UUIDs for retries. No schema migration or live data change. See `docs/ai/OTP_TEMPORARY_BYPASS/README.md`.
- [ ] Before production release: staging end-to-end submission and responsive browser review; assess persistent/edge rate limiting. Production deployment was not performed.

- [x] 2026-09-27 Staff commission payment history:
  - Added `0039_staff_commission_payment_history.sql`. Each Staff **Mark as Paid** action now creates an immutable payout snapshot with exact AED total, included sales, UAE time, and Super Admin confirmer.
  - Added mobile-friendly payment history in Staff Details and a compact Recent Payments section for Super Admin. Existing paid entries preserve amount/timestamp as legacy records without fabricated confirmer data.
  - Apply migration `0039_staff_commission_payment_history.sql` before using the new payout action.

- [x] 2026-09-25 Net-profit expense and commission workflow:
  - Added the additive `0038_expenses_net_profit_commissions.sql` migration. New sales wait for expense confirmation; then Customer Service/Purchaser/Super Admin-authorized records calculate the same net-profit base for 2% Customer Service, 10% Purchaser, and 2% Developer shares.
  - Added auditable manual expense entries, confirmed/unpaid reopening with Super Admin reason, paid-record lockout, and stopped new automatic employee-referral payouts. Existing demo/historical records and Vehicle Catalog are not altered.
  - Added Inventory/lead expense UI, net-profit preview, dashboard net-profit reads, and settings/lead referral copy that accurately states referral awards are company-decided.
  - Verified locally: `npx tsc --noEmit`, `npm run test` (26 files / 224 tests), `npm run lint`, and `npm run build:check`.

- [x] 2026-09-24 Hero Dual CTA Button Alignment & Visual Balance:
  - Redesigned the "I Want to Scrap My Car" button in `Hero.tsx` to balance symmetrically with the primary "Click For Free Valuation" button.
  - Aligned height (`h-14 sm:h-16`), padding (`px-5 sm:px-7`), pill shape (`rounded-full`), and typography (`text-[0.72rem] sm:text-[0.84rem] font-bold uppercase tracking-[0.06em] sm:tracking-[0.08em]`).
  - Added balanced dual-icon rhythm (`CarFront` + label + animated `ArrowRight` with `group-hover:translate-x-1`), frosted obsidian glass backdrop (`backdrop-blur-md bg-black/60`), subtle gold-tinted hairline border (`border-gold/50`), top specular highlight (`inset_0_1px_0`), and gold aura hover shadow.
  - Verified: `npx tsc --noEmit` (0 errors), `npm run lint` (clean).

- [x] 2026-09-15 Manual Lead Modal Overlap & Pinned Layout Hardening:
  - Fixed top overlap and cut-off on Add Lead modal (`ManualLeadDialog`) caused by flexbox negative margin clipping and sticky header stacking context.
  - Implemented React `createPortal(..., document.body)` in `Dialog.tsx` so modals teleport directly to `document.body`, escaping any ancestor CSS `backdrop-filter` or containing blocks.
  - Replaced rigid flex `items-center` with scrollable overlay (`overflow-y-auto`) and self-centering `my-auto` on the dialog card, eliminating negative coordinate data-loss.
  - Structured `ManualLeadDialog` with a **pinned Header** (title, subtitle, and Close "X" button always visible), **scrollable Body** (`flex-1 overflow-y-auto px-6 py-5` with form starting at top), and **pinned Footer** (`Cancel` and `Create lead` buttons always anchored at bottom).
  - Removed redundant lead count pill badge ("72 leads") from the Leads Directory toolbar (`toolbar.tsx`) per user request.
  - Verified live in browser across laptop (1366x768) and mobile (390x844): zero clipping at top, smooth internal scrolling, and verified `tsc --noEmit`, `npm test` (222/222 passed), `npm run lint`.

- [x] 2026-09-15 Multi-Tab Responsive Hardening & Cross-Device Screen Verification:
  - Audited and verified all admin tabs and screens across mobile (390x844), tablet (768x1024), laptop (1366x768), and desktop XL (1920x1080).
  - Resolved Commission table action button collision by increasing minimum table width to 820px, expanding the actions column to 28%, and adding `whitespace-nowrap`.
  - Hardened Inventory filters with `sm:flex-wrap` and table cell figures with `whitespace-nowrap` to prevent multiline wrapping and horizontal overcrowding.
  - Hardened Blocked Numbers tables (OTP limits & blocked records) with `min-w-[760px]`, `whitespace-nowrap` figures, and aligned action buttons.
  - Added mobile sidebar auto-dismiss (`onNavigate`) in `Sidebar.tsx` / `AdminShell.tsx` so clicking any nav link instantly closes the mobile drawer.
  - Verified Lead Detail, Staff Accounts, Settings, and Catalog pages on all viewports, ensuring zero button overlaps, zero text collisions, and zero regressions across all 222 tests.

- [x] 2026-09-15 Leads Directory Responsiveness, Topbar Add Lead CTA & Logo Emblem Enhancement:
  - Added streamlined mobile view (`MobileLeadsList`) that prioritizes the Client Name and essential metadata without crowded 9-column horizontal scrolling on small screens (`block md:hidden`). Full 9-column table reserved for laptops and desktop (`hidden md:block`).
  - Relocated "+ Add Lead" action from the table toolbar directly into the top navigation bar (`Topbar.tsx`) next to the profile menu, styled with an illuminated gold gradient CTA for Super Admin and Call Centre roles.
  - Organized table toolbar into a 2-tier responsive layout with search/metrics/export in Tier 1 and multi-select filter dropdowns in Tier 2, preventing horizontal crowding on laptop screens (1024px–1440px / 1366x768).
  - Fixed table columns with `whitespace-nowrap`, `tabular-nums`, and balanced minimum widths to eliminate awkward multi-line text wrapping (`20,000 km`, `14 Sept 2026`, `Not yet arrived`).
  - Enhanced circular logo badge with isolated high-contrast transparent gold emblem (`logo-mark.png`), eliminating microscopic duplicate text and guaranteeing crisp visibility across all viewports.
  - Verified: `npx tsc --noEmit` (0 errors), `npm test` (26/26 test files passed, 222/222 tests), `npm run lint` (0 warnings, 0 errors), and visual browser verification across mobile (390x844) and laptop (1366x768).

- [x] 2026-09-14 Staff Manual Lead Creation:
  - Added authenticated manual lead entry for Super Admin and Call Centre roles,
    with Walk-in, Phone call, WhatsApp/message, and Other intake sources.
  - Added server-derived creator attribution, duplicate review flags, existing
    Call Centre routing, source visibility, and export support.
  - Added optional inspection scheduling, No Show handling, employee referral
    proof, frozen sold-time incentive amounts, and combined monthly commission
    invoice support.
  - Apply migrations `0030_manual_leads.sql`, `0031_referral_incentives.sql`,
    and `0032_no_show_status.sql` before live use.

- [x] 2026-09-13 Customer Service Arrival Confirmation & Multi-View Visibility:
  - Enabled Call Centre staff, Super Admin, and Manager accounts to record customer arrival across stages `["inspection_scheduled", "inspected", "negotiating", "deal"]` in `LeadDetail.tsx` and `route.ts`.
  - Added visible arrival indicators across the platform: header badge (`✓ Customer Arrived`), Scheduled Inspection card badge and updated message, dedicated Purchaser arrival card, inspection workspace header badge, and Leads Directory table column.
  - Modularized `LeadArrivalCard.tsx`, `LeadScheduledInspectionCard.tsx`, and `LeadPurchaseFields.tsx` ensuring `LeadDetail.tsx` remains strictly under 500 lines (497 lines).
  - Marked lead GENEEEE (`eaf3892f-b874-44d1-bd83-7e5c1fe6b6a4`) as Arrived in database with `arrival_confirmed` event by Agent1.
- [x] 2026-09-13 Incomplete Forms Specification Editing & Pipeline Status Clean-up:
  - Added manual vehicle specification selection to Incomplete Forms workspace (`PartialLeadDetail.tsx`) for Customer Service and added display to `PartialLeadCapturedCard.tsx`.
  - Added persistence for `specification` in `PATCH /api/admin/partial-leads/[id]` with graceful fallback.
  - Aligned active pipeline statuses by removing obsolete `pending` and `closed` ("Not Purchased") from active filters and menus across `LEAD_PIPELINE`, `DETAIL_STATUS_OPTIONS`, `FILTER_STATUS_OPTIONS`, `AGENT_STATUS_CHOICES`, and `PARTIAL_STATUSES`.
  - Hardened specification validation in `app/api/leads/route.ts` and `app/api/admin/partial-leads/[id]/route.ts` with standard fallback names, and retained fallback options in `lib/use-vehicle-catalog.ts` so forms do not break when catalog is empty.
  - Enabled Super Admin and Manager accounts to confirm customer arrival.
  - Preserved Philippine testing number support (`PH_MOBILE_PATTERNS`) per client instruction.
  - Verified: `npx tsc --noEmit` (0 errors), `vitest` (206 tests passing), `eslint` (clean), `npm run build:check` (clean).

- [x] 2026-09-09 Dashboard UI/UX & Chart Visibility Overhaul:
  - Fixed single-color gold ambiguity with intuitive multi-color systems: progressive chromatic 8-stage funnel with conversion percentages, operational urgency inventory aging colors (Emerald -> Sky -> Amber -> Red), and tri-color staff performance.
  - Implemented Dual Y-Axis and prominent Gross Profit visualization so profit values (e.g. AED 1,500) are never dwarfed by high revenue (AED 20,000), plus added a Gross Margin % badge.
  - Fixed "Today only" single-point views across charts: bounded bars (`maxBarSize={48-52}`) and executive single-day comparative cards for revenue & profit.
  - Enhanced KPI cards with luxury glowing icon avatars, accent borders, and margin tags.
  - All automated checks verified: `tsc --noEmit`, `eslint`, `vitest` (192 tests), `build:check`.

- [x] 2026-09-09 Rebuilt the owner-only Overview as a responsive CEO dashboard using existing records only: financial KPIs, custom historical comparison, timestamp-based conversion journey, revenue/profit, visitors, submissions, inventory aging, assigned-lead staff performance, follow-up alerts, and data-quality checks. Source attribution and Overview audit activity remain deliberately out of scope.

- [x] 2026-09-08 Implemented Step 1 from plan.md: roles, access boundaries, and staff accounts (branch: `improvement`).
  - `lib/auth/permissions.ts`, `lib/admin/staff-schema.ts`, `0023_staff_roles_permissions.sql`, `require-staff.ts`, `require-admin.ts` (updated), `staff-projections.ts`, `StaffAccounts.tsx`, staff API routes, settings page wiring, route guards on leads/commission/catalog/blocklist. Tests: 30 passing.
  - **Next**: Run `0023_staff_roles_permissions.sql` against a test Supabase instance and verify one full owner → add call centre → disable → re-enable cycle. Then proceed to Step 2 (attribution) or Step 6 (Nodemailer) per client priority.

- [x] 2026-09-07 Fixed Incomplete Forms note/status saving when the existing Supabase project had the activity table but not the migration RPC. The API now has a validated fallback update and activity insert path; apply migration 0021 later to restore the transactional RPC path.
- [x] 2026-09-07 Updated public valuation capture so a valid name plus phone number automatically creates/updates an incomplete-form record after a short typing pause, even without consent, Next, or closing the form.

## In progress

- [x] 2026-09-24 Permanent Scrap inquiry workflow:
  - Added public Scrap inquiry mode, permanent lead provenance, the protected
    Scrap Inquiries admin view, owner-only Scrap Deal approval, and Inventory
    Scrap badge/filter.
  - Apply migration `0034_scrap_inquiries.sql` before using this feature on
    Supabase/Vercel.

- [x] 2026-09-24 Incomplete Scrap recovery:
  - Preserved valid name-and-phone Scrap form starts in Incomplete Forms,
    with Scrap filters, captured context, and protected conversion back into
    the permanent Scrap workflow.
  - Apply `0035_incomplete_scrap_inquiries.sql` after `0034` before using this
    flow on Supabase/Vercel.

- [x] 2026-09-06 Added a one-time Leads-only demonstration batch: 40 clearly marked
  rows, five per pipeline status, with server-side deletion scoped to the demo
  batch. Apply migration `0020_demo_lead_runs.sql` before using the buttons on
  the deployed app.

- [x] 2026-08-03 Ran migrations 0014, 0015 and 0016 against the live Supabase project and verified the schema and all four functions directly (`KNOWN_ISSUES.md` ISSUE-005).
- [x] 2026-08-03 Set `ADMIN_PREVIEW = false`. The dashboard now reads and writes the real database.

- [ ] Drive one full cycle through the browser on a real (test) lead.
  - Related feature: Inventory, commission, pipeline statuses
  - Acceptance criteria: marking a lead as Deal with a purchase price creates an `inventory` row and the car appears in Inventory; marking it sold writes one `commission_entries` row whose `commission_aed` matches the figure the dialog previewed; `/admin/commission` shows that sale in its month and the quarter total equals the sum of its months.
  - Risks: the SQL is proven, but nothing has exercised the UI → API → SQL path end to end. This is the only untested layer left.
  - Next action: sign in at `/admin/login` and run the cycle.

- [ ] Sanity-check the live Leads screen now that preview mode is off — real leads, real counts, and the two new statuses selectable in Customer Details.

## Deferred (raised, deliberately not built yet)

- [ ] Confirm whether the repo build plan's other M3 items are in scope: `/api/notify` Gmail alerts on a new lead, wiring the Settings page (currently a non-functional mockup — local state only, never calls its own working API), and security headers/CSP (`next.config.mjs` sets only `distDir`). The client's own milestone document does not mention any of them.
- [ ] Decide whether manager accounts should see commission figures at all (RLS currently restricts `commission_entries` and `commission_statements` to `is_admin()`).
- [ ] Statement export (PDF/CSV) for the developer's own invoicing, and VAT/TRN formatting if the developer's side becomes VAT-registered — deliberately out of scope, per the client's choice of a plain commission statement.
- [ ] Allow inventory not sourced from a website lead (auction, walk-in, trade-in) — scoped out by the client; see `DECISIONS.md` ADR-002 for what it would take.

## Previously in progress

- [ ] Run `supabase/migrations/0006_trim_and_option_level.sql` in the Supabase SQL Editor.
  - Related feature: Public valuation form + Admin leads
  - Acceptance criteria: A real form submission (real OTP, real Supabase insert) saves `trim`/`description`/`option_level` and they display correctly on `/admin/leads/[id]`.
  - Risks: None to existing behavior — mock/demo mode keeps working regardless via the graceful-fallback design in `lib/admin/leads-store.tsx` and `use-valuation-form.ts`.
  - Next action: Client/developer runs the migration, then does one real test submission on the live site.

- [ ] Client review of Milestone 1 public landing revisions.
  - Related feature: Public landing page
  - Acceptance criteria: Premium dark glass header, private valuation hero, full-width real-photo sell-side evaluation sections, accepted brand badges, contact-first valuation form, and inspection area field are accepted.
  - Risks: Final logo file, exact Gmail, real financing rules, approved reviews, final make/model dropdown list, and any official brand/logo asset preferences are still needed.
  - Next action: Send/review the live preview and collect exact Gmail, final logo file, final make/model list, and whether financing/reviews should remain preview-only or become later backend scope.

## Next

- [ ] Before each Vercel deployment, complete `VERCEL_DEPLOYMENT_CHECKLIST.md` and retain its release sign-off with the deployment record.
- [ ] Test admin login live (requires a real Supabase Auth user matching an email in `0002_seed.sql`).
- [ ] Decide on lead data retention/deletion policy (`KNOWN_ISSUES.md` ISSUE-004).
- [ ] Add pagination to `/api/admin/leads` before lead volume grows (`KNOWN_ISSUES.md` ISSUE-003).
- [ ] Collect exact CarVibe Gmail address for notifications/footer.
- [ ] Collect final logo file from the group chat and place it in the project if needed.
- [ ] Confirm whether financing and reviews are approved as real backend-backed scope or should remain UI-only previews.
- [ ] Complete loading, empty, error, and mobile states for the live (non-mock) admin data path.

## Blocked

- [ ] Formal UAE legal/compliance review before production (per `RULES.md` UAE privacy rule) — needs client-arranged legal review, not something to resolve in code.

## Completed

- [x] 2026-10-10 Admin Sidebar Sticky/Fixed Scrolling Fix & Modern UI Polish:
  - Fixed sidebar disappearing on scroll by replacing fragile parent sticky context with a dedicated desktop spacer and `fixed top-16 left-0 bottom-0 z-20` layout in `AdminShell.tsx`.
  - Modernized sidebar UX with 3 semantic navigation groups ("Main Workflow", "Finance & Team", "System & Tools"), vertical gold active indicator glow bar, gold pill badge for Scrap Inquiries, clean icons, and live UAE status pill in `Sidebar.tsx`.
  - Verified with live browser scroll tests (`http://localhost:3000/admin`), full test suite (277/277 passed), and pushed to both `origin` and `production`.

- [x] 2026-07-07 Committed and pushed the Milestone 1 landing package to `origin/main` for GitHub/Vercel review.
- [x] 2026-07-07 Prepared Milestone 1 meeting report in Markdown and Word `.docx`, including a non-technical script, live-demo walkthrough, and client question scenarios.
- [x] 2026-07-07 Finalized public landing polish: approved hero kept, hero focus-in animation added, full-page blur replaced with a lighter fade for performance, client `dubaii.jpeg` used in How It Works, How It Works seam blended, and the video band/footer merged into one compact footer.
- [x] 2026-07-05 Tightened "Why Choose Us" sizing (smaller statement/tagline text, compact fixed min-height, tighter spacing) after it was taking up more than a full screen's height, with lint/build verification.
- [x] 2026-07-05 Upgraded "Why Choose Us" to a premium full-bleed photo carousel (real background image, glass arrow controls, slide counter, segmented auto-advance progress bar) and added the missing "How It Works"/"Brands" navbar links, with lint/build verification.
- [x] 2026-07-05 Rebuilt "Why Choose Us" as an auto-advancing 4-slide trust-statement carousel (gold-highlighted phrases, tagline, valuation CTA, arrows/dots), styled after a client reference, with lint/build verification.
- [x] 2026-07-05 Added a scroll-triggered fade/blur reveal animation to the footer's columns and a subtle gold top glow (styled after a client reference, implemented without a new dependency), with lint/build verification.
- [x] 2026-07-05 Removed the "Rent" nav item (Buy-only coming-soon modal now), fixed Hero's leftover "renting" copy, and normalized three sections' drifted background hex colors to the site's actual `bg-bg` token so all sections blend seamlessly, with lint/build verification.
- [x] 2026-07-05 Removed the Financing and fake-Reviews sections (kept the real closing CTA as `FinalCta.tsx`), fixed the navbar "Rent" dangling anchor to open the Coming Soon modal, and refactored the footer (drafted via a 3-agent judge-panel workflow, then independently verified) to drop the redundant background photo/watermark and align cleanly with the new video section, with lint/build verification.
- [x] 2026-07-05 Added a scroll-triggered background-video section before the footer using the client's `footer.mp4` (relocated to `public/videos/`), muted with no controls/loop, only playing while in view, with a blended "CarVibeDubai" wordmark overlay, with lint/build verification.
- [x] 2026-07-05 Simplified Brand Browse (removed the backdrop photo, rewrote copy to "brands we buy - and many more" so unlisted brands don't feel excluded) and added a gold-glow hover-grow animation to each brand logo card, with lint/build verification.
- [x] 2026-07-05 Removed the redundant Vehicle Discovery and Featured Vehicles sections (per client feedback) and added a new Seller Assurance section right after the hero (fair offers, transparency, balanced negotiation, free-valuation CTA), fixing the navbar "Sell" anchor to match, with lint/build verification.
- [x] 2026-07-05 Fixed the hero tagline to a single non-wrapping line, removed the "Introducing/CarVibeDubai" identity block, changed hero/footer copy to UAE-wide (not Dubai-only), replaced "no instant price shown" with "Fair, transparent negotiation", made the navbar "Buy" item open a real Coming Soon modal with a blurred backdrop, removed the Body Type Browse section, and added a new Flexible Inspection section (your location or meet halfway), with lint/build verification.
- [x] 2026-07-05 Added a thin black/gold `UtilityBar` (language label, phone, Facebook/Instagram) above the main navbar, rebuilt the hero with a reference-style "Introducing / CarVibeDubai / Car Buying & Valuation Specialists" identity block plus an outlined CTA, switched the hero image to the client-provided `public/images/hero.jpeg`, and converted the "what we buy" brand-logo grid into an animated infinite marquee, with lint/build verification and privacy/terms pages updated to match.
- [x] 2026-07-05 Hero reverted to the search-bar CTA layout after client feedback (buying-desk two-button version was not preferred), keeping the Dubai Lamborghini image, a larger headline, "we buy your car" lead copy, a hardened mobile-safe CTA, and a clean dev-server restart, with lint/build verification.
- [x] 2026-07-05 Buying-desk hero redesign completed: Dubai Lamborghini hero image, larger headline, "we buy your car" lead copy, gold valuation + WhatsApp CTA pair replacing the search bar, trust row, `Call Now`/`Message Us` navbar actions, and `Coming soon` badge moved to `Buy`, with lint/build verification.
- [x] 2026-07-05 Reference-style hero/header refactor completed with centered pill navigation, `Sell` coming-soon label, Book Now/Login actions, search-bar-style valuation CTA, unchanged valuation form, lint, build, and desktop layout verification.
- [x] 2026-07-05 Real-photo full-width landing redesign completed from selected `public/images/` assets with lint, build, desktop preview, and mobile overflow verification.
- [x] 2026-07-05 Premium public landing UI/UX refactor completed with lighter typography, private valuation hero copy, refined logo/header treatment, asymmetrical vehicle lookbook, reordered homepage flow, concierge contact layout, and lint/build verification.
- [x] 2026-07-05 Public Brand Browse badges updated with lightweight brand-colored SVG treatments.
- [x] 2026-07-03 Editorial-minimal visual redesign of the public landing page completed: flattened canvas background, strict gold usage budget, hairline dividers replacing gold card borders, borderless numbered/divided lists across all sections below the hero, shared Section/SectionHeader components, and dead-code removal. Verified with lint, build, and Playwright visual/interaction checks.
- [x] 2026-07-03 Marketplace-style homepage redesign implemented from the attached UI/UX brief while keeping inventory/financing request-based.
- [x] 2026-07-03 Premium sell-side homepage refinement completed: redundant WhatsApp/search/listing actions removed, generated car imagery added, brand badges upgraded, and floating WhatsApp button removed.
- [x] 2026-07-02 Public header, font, and hero first-view modernization completed.
- [x] 2026-07-02 Public valuation WhatsApp validation bug fixed for common UAE mobile formats.
- [x] 2026-07-02 Milestone 1 public landing revisions implemented from Sir Nyash's form answers.
- [x] 2026-07-02 Proposal-aligned 45-day milestone plan and client message generated from the signed PDF and build plan.
- [x] 2026-06-30 Public landing section redesign implemented for How It Works, Contact, and Footer.
- [x] 2026-06-30 Public landing section redesign verified with lint, production build, desktop anchor behavior, and mobile overflow checks.
- [x] 2026-06-30 How It Works and Contact changed to unique non-photo layouts instead of reusing the hero image.

## Update rule

### Next action — production database verification

- [ ] Apply migrations `0030_manual_leads.sql`, `0031_referral_incentives.sql`,
  `0032_no_show_status.sql`, and `0033_inspection_schedule_notifications.sql`
  to the intended Supabase project before
  deploying this workflow.
- [ ] With non-production data, verify employee referral creation with proof,
  sale-triggered frozen incentive, combined staff invoice, and Super Admin
  payment.

### Next action — arrival and inspection report

- [ ] Apply `supabase/migrations/0027_inspection_arrival_reports.sql` to the
  intended Supabase project.
- [ ] In Super Admin → Vehicle Catalog, add the live Specification options.
- [ ] Test one scheduled lead end to end: CSR marks Arrived; assigned Purchaser
  completes every required inspection field and all 24 photos with notes; download the PDF
  and confirm the lead becomes Inspected exactly once.
- [ ] Apply migration `0028_inspection_audit_retention_vin.sql`, set a strong
  production-only `CRON_SECRET`, then verify editable completed reports, VIN
  search, activity history, and one authorized retention-job test.

### Next action — Incomplete-form handoff

- [ ] Apply `supabase/migrations/0026_partial_lead_csr_handoff.sql` to the
  intended Supabase project, then run one controlled CSR-to-Purchaser handoff
  with non-production data.

Every coding session must leave one clear next action.
