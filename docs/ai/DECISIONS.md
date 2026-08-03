# DECISIONS.md

Record only important decisions future developers must understand.

## ADR-001 — Commission is frozen at the moment of sale, not computed on read

**Date:** 2026-08-03
**Status:** Accepted

### Context

Milestone 3 pays the developer 2% of the profit on every car the owner buys and
resells. The owner types both figures the payment depends on — the purchase
price and the sale price — and can legitimately need to correct a typo later.

### Decision

When a car is marked sold, `sell_inventory_item()` (migration 0014) writes a
`commission_entries` row capturing the purchase price, sale price, profit, rate
and commission. Everything downstream reads that snapshot. The sale and its
entry are written in one transaction, and a sold car's figures are then
immutable — the API and the DB both refuse to change them.

### Alternatives

- Derive profit and commission live from `inventory` whenever a screen renders.
- Recalculate at the end of each quarter when the statement is produced.

### Consequences

- Correcting a purchase price after a sale is deliberately blocked rather than
  silently repricing an amount that may already have been invoiced and paid.
- The 2% rate can be renegotiated without rewriting the history of past
  payments, because each entry carries the rate it was calculated at.
- Costs the loss rule as agreed: `commission = max(profit, 0) × rate`. A loss
  records an entry at zero and never reduces commission owed on other cars.
- The rule now lives in two places — SQL (authoritative, what gets written) and
  `lib/admin/inventory.ts` (`previewCommission`, shown live while the owner
  types). Changing one without the other is a real hazard; both files say so.

## ADR-002 — Inventory is its own table, not columns on `leads`

**Date:** 2026-08-03
**Status:** Accepted

### Context

Every car currently comes from a website lead, one-to-one, so the purchase and
sale figures could simply have been extra columns on `leads`.

### Decision

A separate `inventory` table owns all the money, linked to the lead by a
`NOT NULL UNIQUE` foreign key with `ON DELETE RESTRICT`.

### Alternatives

- Add `purchase_price_aed` / `sale_price_aed` to `leads` and treat "Inventory"
  as a filtered view of leads at status `deal`.

### Consequences

- ISSUE-004 (no data retention/deletion policy) can be resolved without
  destroying financial history: lead personal data can be erased or anonymised
  while the commission ledger survives. `ON DELETE RESTRICT` enforces this
  rather than leaving it as an intention.
- Allowing stock that did not come from a lead (auction, walk-in, trade-in) is
  later a matter of dropping `NOT NULL` and adding a form — not a migration of
  the money onto a different table. The client scoped that out for now.
- Costs one extra fetch on the lead detail page to show what was paid.

## Template

## ADR-XXX — Decision title

**Date:**  
**Status:** Proposed | Accepted | Rejected | Superseded

### Context

Why was a decision needed?

### Decision

What was chosen?

### Alternatives

- Option A
- Option B

### Consequences

What becomes easier, harder, required, or prohibited?
