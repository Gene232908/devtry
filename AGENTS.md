# AGENTS.md — CarVibe AI Instructions

## Purpose

This is the main instruction file for every AI coding session.

The AI must help as a senior full-stack developer while keeping the project:

- Clean and maintainable.
- Secure by default.
- Mobile-first.
- Fast and optimized.
- Easy to continue in another session.
- Ready for future Supabase integration.

Do not claim that the system is fully secure, legally compliant, or production-ready unless verified.

## Daily startup — keep it short

For every task, read only:

1. `AGENTS.md`
2. `RULES.md`
3. `docs/ai/PROJECT_CONTEXT.md`
4. `docs/ai/TASKS.md`

Read `ARCHITECTURE.md`, `FEATURES.md`, or a specialist document only when the
requested change touches that area. Read only the latest 40 lines of
`WORK_LOG.md` or `CHANGELOG.md` when history is actually needed. Do not load
entire historical logs into context.

Then inspect the actual affected code before editing.

## Read extra files only when relevant

### UI, layout, dashboard, form, table, or mobile task

Read:

- `docs/ai/RESPONSIVE_PERFORMANCE.md`

### Authentication, authorization, database, upload, personal data, API, or security task

Read:

- `docs/ai/SECURITY_COMPLIANCE.md`
- `docs/ai/DATABASE_PLAN.md`

### Deployment, Vercel, CI/CD, environment, migration, backup, or production task

Read:

- `docs/ai/RELEASE_OPERATIONS.md`

### Important architecture or rule decision

Read and update:

- `docs/ai/DECISIONS.md`

### Bug or unresolved issue

Read and update:

- `docs/ai/KNOWN_ISSUES.md`

### Weekly or meeting report

Read:

- `docs/ai/REPORTING.md`

### Final Supabase implementation

When the user sends `FINISH THE PRODUCT`, read every file under `docs/ai/` and follow:

- `docs/ai/FINALIZATION_PROTOCOL.md`

## Mandatory pre-code check (brief)

Before writing code:

1. Restate the requested behavior in one sentence.
2. Inspect the affected implementation and search its usages.
3. Choose the smallest safe solution and one verification plan.
4. Consider security, mobile, and performance only when relevant.

Do not perform a broad rewrite when a small safe change is enough.

## Implementation rules

For every task:

- Preserve working behavior.
- Reuse existing patterns.
- Keep UI, business logic, validation, and data access separated.
- Validate untrusted input.
- Do not trust the browser for authorization.
- Never concatenate user input into SQL.
- Never expose secrets or Supabase service-role keys.
- Prevent unnecessary requests, large bundles, and unbounded data loading.
- Keep interfaces responsive from mobile to large desktop.
- Add or update tests when behavior changes.
- Run checks appropriate to the change; do not run every check by default.
- Report checks truthfully.

### Verification by task size

- Copy, styling, or isolated UI change: run `npm run lint` if available.
- TypeScript, shared component, hook, or API change: run `npx tsc --noEmit`
  plus focused tests when available.
- Business logic, auth, database, or security change: run focused tests and
  typecheck; run lint if the affected files are linted.
- Release or deployment request only: run `npm run build:check`.

If a check fails, fix that failure or report it immediately. Do not repeatedly
rerun the same failing command, start unrelated refactors, or wait indefinitely.
Use a reasonable command timeout and stop when the requested behavior is
implemented and the relevant check has completed.

## Documentation update rule

After each meaningful code change, update only the affected files:

- `FEATURES.md` for feature behavior or status.
- `ARCHITECTURE.md` for structure or data flow.
- `DATABASE_PLAN.md` for data requirements.
- `SECURITY_COMPLIANCE.md` for security/privacy impact.
- `RESPONSIVE_PERFORMANCE.md` for reusable UI/performance decisions.
- `DECISIONS.md` for important decisions.
- `KNOWN_ISSUES.md` for unresolved problems.
- `TASKS.md` for current progress.
- `WORK_LOG.md` for the daily factual record only when the task is completed.
- `CHANGELOG.md` only for a user-visible completed feature or fix.
- `HANDOFF.md` for the latest resumable state.

Do not update unrelated documentation just to say it was reviewed. Do not copy
large implementation histories into multiple documents.

## Scope and progress guard

Work on one requested outcome at a time. Do not broaden a task into a redesign,
cleanup, documentation rewrite, or unrelated bug fix unless explicitly asked.
After inspecting the code, make the first small patch quickly and report any
blocker with the exact file, command, and error. If no meaningful code change
is possible, stop and explain why instead of spending the session on analysis.

## Completion report

At the end of a task, report:

- What changed.
- Files created or modified.
- Checks actually run.
- Security, mobile, and performance impact.
- Documentation updated.
- Remaining risk or next step.

## Calling commands

Use these as standalone messages:

- `CALLME`
- `DAY5REPORT`
- `FINISH THE PRODUCT`
- `NABIGAY NA NI SIR NYASH ANG WHATSAPP BUSINESS NUMBER`

### WhatsApp OTP production command

When the user sends `NABIGAY NA NI SIR NYASH ANG WHATSAPP BUSINESS NUMBER`,
read `docs/ai/WHATSAPP_OTP_PRODUCTION_SETUP.md` completely before advising or
changing anything. Follow its guided checkpoint workflow one step at a time,
recheck current official Meta requirements, and never ask the user to paste
payment-card data, access tokens, OTPs, passwords, or secret keys into chat.

The command starts the guided production setup but does not by itself authorize
registering/migrating a number, adding a payment method, sending real messages,
or deploying to production. Obtain explicit confirmation at the applicable
checkpoint, preserve any existing WhatsApp account/chats, and do not claim the
setup is production-ready until the runbook's acceptance checklist is verified.
