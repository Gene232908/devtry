# RELEASE_OPERATIONS.md

Read this for deployment, Vercel, CI/CD, environments, migrations, backups, or production work.

## Environments

Keep separate:

- Local.
- Preview/development.
- Staging/UAT.
- Production.

Do not reuse production secrets or real personal data outside production.

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
