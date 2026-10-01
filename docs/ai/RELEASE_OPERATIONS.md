# RELEASE_OPERATIONS.md

## 2026-10-01 capture-session release order

1. Back up the target database and apply
   `0041_partial_lead_capture_sessions.sql` after migration `0040`.
2. Run the migration verification query documented in the handoff: confirm
   both columns, the unique index, the 20-argument function, and execute access
   limited to `service_role`.
3. Deploy the matching `almostdone` application commit. The API has a temporary
   legacy-signature fallback, but session typo dedupe is not active before the
   migration.
4. With controlled non-production numbers, test Valuation and Scrap separately:
   wait five seconds on one valid-looking number, correct one digit, close the
   modal, and confirm there is one row containing only the corrected number.

Rollback: roll back application code first. Leave the additive columns and
index in place; the legacy RPC call remains compatible and no customer row
needs to be deleted.

## 2026-10-01 incomplete-form retention release order

1. Back up the target Supabase database and apply `0040_partial_lead_retention.sql` before deploying the application code.
2. Keep the existing server-only `CRON_SECRET` configured in the Vercel target environment. Do not expose it with a public framework prefix.
3. Deploy and confirm `/api/cron/incomplete-form-retention` is registered as a daily cron. Vercel Hobby timing may vary within the scheduled hour.
4. Verify one controlled stale test partial archives, a returning capture restores it, and a converted test partial remains unchanged. Do not age or delete real customer rows for testing.
5. Check Vercel function logs for `backlogMayRemain`; if true on repeated days, inspect volume before increasing the bounded batch cap.

Rollback: disable the incomplete-form cron first, then roll back application code. Keep the additive column/table/function in place until retained data and rollback implications have been reviewed; do not reverse the migration by deleting data.


Read this for deployment, Vercel, CI/CD, environments, migrations, backups, or production work.

## Environments

Keep separate:

- Local.
- Preview/development.
- Staging/UAT.
- Production.

Do not reuse production secrets or real personal data outside production.

### Lead notification email

- Set `LEAD_NOTIFICATION_SMTP_USER` and
  `LEAD_NOTIFICATION_SMTP_APP_PASSWORD` in each environment. Use a Gmail app
  password, never an account password.
- `LEAD_NOTIFICATION_FROM` is optional. The notification recipient is not an
  environment variable: it is the owner-managed Notify email in Settings.
- After deployment, an owner should save the desired recipient and use
  **Send test email** in Settings before accepting live leads.

## CI checks

Run applicable checks:

- Install from lockfile.
- Lint.
- Type check.
- Tests.
- Build.
- Secret scan.
- Dependency audit.
- Migration validation.
- Security-policy tests.
- Smoke tests.

## Deployment

- Production requires explicit human approval.
- Protect non-public preview and staging deployments.
- Verify environment variables.
- Record the release version.
- Run post-deployment smoke checks.
- Keep a rollback method.

## Database migrations

- Use tracked migrations.
- Do not edit already-applied production migrations.
- Prefer backward-compatible changes.
- Test migrations in staging.
- Back up before destructive changes.
- Never reset a remote database without explicit approval.

## Reliability

Before production, define:

- Backup scope.
- Retention.
- Restore process.
- Rollback.
- Monitoring.
- Error tracking.
- Uptime checks.
- Database health alerts.
- Security alerts.

A backup is not trusted until restore is tested.

## WhatsApp OTP incident stop

For unexpected OTP charges, abuse, wrong-recipient reports, or suspected
credential exposure, set the Production-only environment value
`WHATSAPP_OTP_SENDING_ENABLED=false`, then create a new deployment. This stops
the server route before it writes an OTP record or calls Meta. Verify the
release, investigate Meta Account Quality and non-sensitive server logs, and
run an approved canary before restoring the value to `true` and redeploying.
