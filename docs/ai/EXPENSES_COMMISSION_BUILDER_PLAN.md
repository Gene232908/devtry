# Expenses, net-profit commissions, and referral decision — builder plan

Status: Implemented locally on 25 September 2026; pending migration application and separate role-based database verification. No existing demo or production financial record was recalculated.
Source: Sir Nyash's 25 September 2026 meeting transcript and subsequent WhatsApp clarification: “Referral we will decide i think dont put it” and “Its a company decision to give someone referral should not come automatic.”

## Business rules confirmed

1. Every purchased car, regular valuation or Scrap, may have actual expenses. Staff enter the amount manually. Do not assume a fixed transfer fee or manufacture an expense when none is recorded.
2. Examples of expenses: transfer, towing, repair, fuel, transport, hospitality, advertising. Use the simple UI label **Expenses**, with a description for each entry. Receipt upload is deferred.
3. Customer Service, Purchaser, and Super Admin may record expenses and confirm they are complete for vehicles already within their existing authorized access. A confirmation stores the actor and time. It does not grant visibility to unrelated customer records.
4. For sold cars: `net profit before commissions = sold price - bought price - sum(manual expenses)`. Staff and developer percentage shares use `max(net profit, 0)`, each against the same base. Keep the existing role rates unless a separate instruction changes them: Customer Service 2%, Purchaser 10%, Developer 2%. Preserve the actual negative net profit for reporting when there is a loss.
5. Sir Nyash wants all involved roles to see the car's bought price, expenses, sold price, and net profit for transparency. Review the current role projections and apply this only to their authorized records. Keep other staff members' payout amounts separate from a person's own commission view.
6. **Referral is undecided. Do not add an automatic referral incentive, referral-based car expense, or new referral deduction formula.** Having referral evidence on a lead must not automatically create a payable incentive when the car is sold. The company will decide whether to award one and the amount/rule later. Do not show a default Settings amount as an entitlement.
7. Preserve all existing demo leads, inventory, referral records, staff accounts, and Vehicle Catalog exactly as found. Do not delete, backfill, or silently recalculate demo sales or payments. No migration may rewrite historical financial figures without a separate reviewed decision.
8. If any related commission is already paid, ordinary expense edits are locked. A Super Admin must record a reason and explicitly resolve any overpayment/underpayment; preserve the original paid amount and payment record. No automatic deduction from later payouts.

## Important current behavior the builder must change

- `supabase/migrations/0031_referral_incentives.sql` defines `sell_inventory_item()`. Today that function immediately marks Sold, freezes role/developer commissions from `sale - purchase`, and automatically inserts `staff_referral_incentives` from `settings.referral_incentive_aed` for an employee referral. This conflicts with rules 4 and 6.
- The same migration's `pay_staff_commission()` pays unpaid role and referral entries together. Removing the automatic referral insert in the app alone is insufficient: the database function is authoritative. Existing referral rows, especially paid rows, must remain untouched.
- `lib/admin/inventory.ts` previews commission from `sale - purchase`. Update the preview and the authoritative SQL together; they must agree on expense total and rounding.
- `lib/admin/executive-overview.ts`, `lib/admin/queries.ts`, commission details, statements, invoices, staff results, exports, and inventory summaries have financial reads/aggregations that need tracing. Do not assume a change to the sale dialog updates all screens.
- `lib/server/staff-projections.ts` currently redacts financial data for Customer Service. Review server-side permissions as well as UI; merely displaying a new card is not sufficient.

## Proposed simple daily flow

| Stage | Visible action | Result |
| --- | --- | --- |
| Customer handling | **Add expense** in the assigned customer record | Staff enter description and AED amount. Total updates; activity records who entered it. |
| Deal / car bought | Purchase price saved; **Expenses** summary below it | Expense entries stay linked to the same vehicle when it enters Inventory. |
| In stock | **View / Add expense** from customer record and Inventory | Both entry points use the same expense list. |
| Sold | **Record sale** with bought price, expenses, sold price, and provisional net profit | Stock becomes Sold. Financial status says **Expenses to confirm**; no commission is payable yet. |
| Review | **Confirm expenses complete** for any authorized role | Show full current expense list and calculation before confirming. Freeze the base and create the applicable role/developer commission snapshots together. |
| Unpaid correction | **Correct expenses** | Reopen review with a reason; block payment until all amounts are recalculated and reconfirmed together. |
| Paid correction | Contact Super Admin | Ordinary editing stays locked; Super Admin handles a separately recorded adjustment decision. Do not silently edit a paid invoice or deduct from a future payment. |

Keep the record and inventory UI compact: show one expense total and one **Add expense** button. Open the entry list on demand with bounded pagination or scrolling. Show **Confirm expenses complete** only for a sold car awaiting review, and **Correct expenses** in a secondary actions menu after confirmation. No separate Expenses sidebar page.

## Calculation example

| Item | AED |
| --- | ---: |
| Bought price | 20,000.00 |
| Sold price | 25,000.00 |
| Manually entered expenses | 520.00 |
| Net profit before commissions | 4,480.00 |
| Customer Service, 2% | 89.60 |
| Purchaser, 10% | 448.00 |
| Developer, 2% | 89.60 |

Each share uses AED 4,480.00. An absent referral decision contributes **zero** referral expense and **zero** referral payout; do not invent an AED 100 example as a rule. Referral evidence can remain visible as evidence without a payable amount.

## Proposed data and permission design

- Use vehicle/inventory-linked expense entries with amount in AED to two decimals, short description, creator, timestamps, and audit events. Assign the expense to the lead/vehicle in a way that survives Deal and Inventory navigation; prevent duplicate ledgers.
- Add a separate financial review state for Sold cars; do not misuse vehicle stock status. Store the expense total and net-profit/commission snapshot at confirmation. Treat financial finalization and all related commission inserts as one atomic, idempotent database operation.
- Lock or version the reviewed expense set to prevent a simultaneous edit from being excluded. A second confirmation, double click, or request retry must not create duplicate commission rows.
- Validate amount, length, and role/record access on the server. Expense edits, confirmation, reopening, and settlement decisions require authenticated actors and audit records. Restrict payout APIs to confirmed entries, not just buttons.
- A referral found in a lead remains non-payable until a future company decision process is specified. Do not remove proof, history, or existing demo referral entries. The builder should change the sale trigger so it stops creating new referral payouts; keep historical reads and payments intact unless a later policy says otherwise.
- Be careful with records that have no Inventory row before Deal. Decide whether a pre-Deal expense is attached to the lead and later linked to the Inventory car, or stored against a stable vehicle key from the start. A Closed / Not Purchased lead can retain its expenses without generating commission.
- Keep money math in database numeric/decimal fields with explicit two-decimal rounding. Do not use floating-point totals as the financial authority.

## Build order and verification gates

1. Inventory every write/read path for sale, percentage commission, referral, statements, dashboards, exports, and payment. Document the current output for one regular and one Scrap test car.
2. Add schema, secure expense APIs, server authorization, and audit. Verify Add/Save/Cancel/Edit/Remove, simultaneous additions, validation, and role isolation before adding more UI.
3. Add the compact Expenses section to customer and Inventory records. Verify navigation and narrow mobile widths.
4. Split Sold from expense confirmation, update the database sale and finalization functions, and disable new automatic referral incentive creation. Verify sale and finalization transaction rollback, duplicate requests, stale reviews, and payout blocking.
5. Update role projections, financial previews, summaries, staff/developer commission screens, invoices, PDF/Excel/CSV, and executive totals to read the same confirmed net-profit snapshot. Verify the AED 4,480 / 89.60 / 448 / 89.60 example everywhere.
6. Verify unpaid corrections, paid lockout and Super Admin review path, zero expenses, multiple expenses, cents, break-even, losses, role reassignment, regular/Scrap origins, and an employee referral that creates no automatic payout.
7. Run focused tests, typecheck, lint, production build, then exercise real buttons in a separate preview/test database for each role. Report passed, failed, and untested checks. Preserve all current demo data and Vehicle Catalog.

## Decisions still pending, do not guess during the build

- Future referral approval workflow: which company role approves, what amount can be awarded, when it becomes payable, and whether an approved amount should later count as a vehicle expense. Until decided, create no new automatic payable referral entries and do not deduct a referral from net profit.
- Precise post-payment settlement options and UI for overpayment/underpayment. Initial implementation may block ordinary edits and require a manual Super Admin review with an audit reason, but must not invent a new payout formula.
- Whether the Developer account can confirm expenses on a vehicle and what non-customer financial view it should have. The meeting confirms transparency of financial figures; it does not authorize broad customer-record access. Existing authorized staff roles above can complete the daily flow.

## Release boundary

This plan is local documentation for builder review. It does not authorize deployment, payment, modification of existing demo entries, or a Vehicle Catalog change. Apply any new migration before deploying code that requires its columns/functions, then validate the live environment separately.
