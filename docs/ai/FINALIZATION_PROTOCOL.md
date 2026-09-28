# FINALIZATION_PROTOCOL.md

Activate only when the user sends:

```text
FINISH THE PRODUCT
```

## 1. Full audit

- Read every file under `docs/ai/`.
- Inspect the complete repository.
- Identify every implemented page, role, feature, form, mock source, service, type, validation schema, and unfinished action.
- Search for mock data, local storage, placeholder IDs, fake success states, TODOs, direct database coupling, and missing permissions.

## 2. Final database design

Create:

- Final tables.
- Fields and types.
- Relationships.
- Constraints.
- Indexes.
- Status rules.
- RLS matrix.
- Storage plan.
- Audit requirements.
- Migration order.
- Mock-to-Supabase replacement plan.

## 3. Supabase implementation

Create:

- Tracked SQL migrations.
- Tables and relationships.
- Timestamp handling.
- Indexes.
- RLS policies.
- Secure functions where justified.
- Private storage and policies.
- Development seed data.
- Typed Supabase adapters.
- Validated environment configuration.

## 4. Safe feature replacement

For each feature:

1. Keep the working mock flow.
2. Add the Supabase adapter.
3. Test it.
4. Connect the feature.
5. Verify create, read, update, archive/delete, validation, permissions, mobile behavior, and performance.
6. Remove obsolete mocks only after verification.

## 5. Security and UAE privacy review

Verify:

- RLS.
- Role restrictions.
- Secrets.
- Private storage.
- Safe queries.
- Rate limits.
- Personal-data purpose.
- Retention and deletion.
- Vendor and hosting questions.
- No real personal data in test data.
- Items requiring formal UAE legal/compliance review.

## 6. Performance and operations review

Verify:

- Pagination.
- Useful indexes.
- No obvious N+1 queries.
- No duplicate requests.
- Mobile performance.
- CI checks.
- Staging.
- Backups and restore.
- Rollback.
- Monitoring and alerts.

## 7. Validation

Run available commands such as:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Record exactly what passed and what was not tested.

## 8. Final report

Report:

- Completed features.
- Database objects created.
- RLS coverage.
- Mock code replaced.
- Security and privacy review.
- Performance review.
- Tests and build status.
- Remaining blockers.
- Manual setup.
- Deployment readiness.

## Not authorized

This command does not authorize:

- Production deployment.
- Remote database reset.
- Destructive production migration.
- Secret exposure.
- Paid-service activation.
- Real payment processing.
- Real customer notifications.
