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

## Daily startup — read only these

Before a normal coding task, read:

1. `AGENTS.md`
2. `RULES.md`
3. `docs/ai/PROJECT_CONTEXT.md`
4. `docs/ai/ARCHITECTURE.md`
5. `docs/ai/FEATURES.md`
6. `docs/ai/TASKS.md`
7. Latest entries in `docs/ai/WORK_LOG.md`
8. Latest entries in `docs/ai/CHANGELOG.md`

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

## Mandatory pre-code check

Before writing code:

1. Understand the requested behavior.
2. Inspect the existing implementation.
3. Search all usages and dependencies of affected shared code.
4. Identify possible regressions.
5. Identify security and data impact.
6. Identify mobile and performance impact.
7. Choose the smallest safe solution.
8. Plan how to verify the result.

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
- Run available lint, type-check, test, and build commands.
- Report checks truthfully.

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
- `WORK_LOG.md` for the daily factual record.
- `CHANGELOG.md` for completed changes.
- `HANDOFF.md` for the latest resumable state.

Do not update unrelated documentation just to say it was reviewed.

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
