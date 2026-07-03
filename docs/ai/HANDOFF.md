# HANDOFF.md

## Current state

- Phase: frontend and workflow development.
- Backend: waiting for client approval.
- Supabase: planned, not final.
- Client milestone package: generated under `docs/client/` and aligned with the signed proposal PDF plus `CARVIBE_BUILD_PLAN.md`.
- Milestone 1 public landing revisions from Sir Nyash's form answers are implemented in the UI only.
- Weekly report: `CALLME`.
- Five-part presentation: `DAY5REPORT`.
- Backend finalization: `FINISH THE PRODUCT`.

## Last completed work

Refactored the public landing page's visual design to an editorial-minimal black-and-gold style: one flat canvas background, a strict gold usage budget (eyebrows, primary CTA, stats/step numbers, hover, two bookend dividers only), hairline dividers instead of gold card borders, and borderless numbered/divided lists instead of boxed cards across every section below the hero. Hero kept its layout, photo, and copy with polish-only styling. Added shared `Section`/`SectionHeader` components and a `buttonClasses()` helper. Removed unused `HowItWorks.tsx` and `CarSkylineArt.tsx`. This is a styling-only change — no copy, data, or behavior changed.

## Current task

Review the redesigned Milestone 1 public landing page with the client, then collect exact Gmail, final logo file, final make/model list, official brand/logo asset preferences if any, and confirmation on financing/review scope.

## Important decisions

- Normal source files should remain below 500 lines.
- Data access should use repositories or services.
- Mobile, security, and performance are required.
- Supabase finalization begins only after approval.

## Known blockers

- Client approval of the finalized milestone schedule.
- Final access/details for domain, Supabase, Twilio, Gmail, Vercel, and Meta Pixel if used.
- Exact CarVibe Gmail address.
- Final logo file from the group chat.
- Final make/model dropdown list and future editable dropdown rules.
- Approval and real data/rules for financing estimates and customer reviews.
- Official brand/logo asset preferences if Sir Nyash wants exact brand files instead of the current badge-style marks.
- Final dashboard users, CRM pipeline wording, and remaining business contact details.

## Exact next action

Share the fixed `http://localhost:3021` Milestone 1 preview for client review, then collect exact Gmail, final logo file, final make/model dropdown list, official brand/logo asset preferences, and whether financing/reviews should remain preview-only or become later backend scope.
