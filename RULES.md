# RULES.md — CarVibe Development Rules

## 1. File-size rule

Normal source files should remain below **500 lines**.

When a file approaches or exceeds 500 lines:

- Split it by responsibility.
- Use clear file names.
- Preserve behavior.
- Update imports and tests.
- Do not split generated files, migrations, lockfiles, or large static datasets only to satisfy the limit.

## 2. Clean-code rule

- Use descriptive names.
- Avoid duplicate logic.
- Avoid `any` when a safe type is possible.
- Keep components focused.
- Keep business logic out of visual components.
- Keep database calls out of reusable UI components.
- Do not leave dead code, fake success states, empty catch blocks, or untracked TODOs.

## 3. Safe-change rule

Before changing shared code:

- Search every usage.
- Understand existing props or contracts.
- Prefer additive changes.
- Check related pages and flows.
- Avoid unrelated refactors.

## 4. Security rule

- Never hardcode secrets.
- Never expose service-role keys to the browser.
- Validate input on a trusted boundary.
- Use parameterized database access.
- Enforce authorization through trusted server logic or Supabase RLS.
- Use private storage for personal documents.
- Do not log passwords, tokens, identity documents, or payment details.
- Rate-limit risky public endpoints.
- Do not use real personal data in development, demos, seed data, or AI prompts.

## 5. UAE privacy rule

For personal data, document:

- Purpose.
- Required fields.
- Access.
- Retention.
- Deletion.
- Hosting or vendor impact.

Formal UAE legal/compliance review is still required before production.

## 6. Mobile-first rule

Every affected page must work at:

- 320px
- 375px
- 430px
- 768px
- 1024px
- 1280px
- 1440px+

Prevent horizontal overflow, unreadable text, tiny touch targets, and broken dialogs or tables.

## 7. Performance rule

Avoid:

- Unbounded data loading.
- N+1 queries.
- Duplicate requests.
- Large unnecessary client components.
- Heavy dependencies for simple tasks.
- Unoptimized images.
- Blocking non-critical work.
- Indefinite loading states.

## 8. Testing rule

Use the real scripts from `package.json`, as appropriate to the task:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not claim a check passed unless it was actually run. A full build is not a
default requirement for every edit; reserve it for release requests or changes
that can affect production compilation across routes.

## 9. Production rule

The AI must not automatically:

- Deploy to production.
- Reset a remote database.
- Delete production data.
- Change billing.
- Expose secrets.
- Send real customer notifications.
- Activate real payments.

These require explicit approval.

## 10. Definition of done

A task is done only when:

- The requested behavior works.
- Existing related behavior still works.
- Security, mobile, and performance impact were considered.
- Available checks were run.
- Documentation is synchronized.
- Remaining risks are reported honestly.
