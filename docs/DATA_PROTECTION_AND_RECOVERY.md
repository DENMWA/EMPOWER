# EmpowerNotes Data Protection and Recovery

## Production boundary

- Production Supabase project: `sooqmuxxwlefnmwwplzv` (`EmpowerNotes ai`).
- Vercel production must point to that project reference.
- Never replace the production project URL or key without a written migration and rollback plan.
- Application deployments do not replace Supabase database or Storage data.

## Current verified controls

Verified on 16 August 2026:

- 66 of 66 public tables have Row Level Security enabled.
- The Storage bucket is private.
- Database and Storage contain trial records and must be treated as recoverable production assets.
- GitHub quality checks reject clearly destructive SQL patterns.
- `NEXT_PUBLIC_READ_ONLY_MAINTENANCE=true` blocks application writes while retaining reads and approved exports.

RLS being enabled does not prove every policy is correct. Run Supabase security advisors after every database change and resolve warnings through reviewed migrations.

## Backup coverage

Supabase scheduled database backups are configured by the project plan under **Database > Backups**. Confirm the dashboard shows a successful backup before onboarding paying customers. Point-in-Time Recovery is preferable once live write volume justifies it.

Database backups do not restore deleted Storage objects. Establish a separate encrypted, off-site copy of the private `participant-documents` bucket. The copy must retain each full organisation-scoped object path and must not be placed in a public bucket.

| Item | Record |
| --- | --- |
| Backup timestamp (UTC) | |
| Database backup or PITR point | |
| Storage snapshot location | |
| Encryption/key custodian | |
| Person completing verification | |
| Restore test result | |

## Routine deployments

1. Confirm GitHub quality checks pass.
2. Confirm the migration is additive or backwards compatible.
3. Use read-only maintenance mode for incompatible schema changes.
4. Verify sign-in, client read, note read, one controlled write, private-file download and tenant isolation.
5. Monitor Vercel and Supabase errors before ending the change window.

## Database maintenance

1. Confirm a recent database backup and Storage snapshot exist.
2. Set `NEXT_PUBLIC_READ_ONLY_MAINTENANCE=true` in Vercel Production and redeploy.
3. Verify the amber read-only banner appears and a test save returns the maintenance message.
4. Apply only the reviewed migration. Never run a filename or local path in the SQL editor.
5. Run post-change checks and the Supabase security/performance advisors.
6. Deploy compatible application code if required.
7. Set `NEXT_PUBLIC_READ_ONLY_MAINTENANCE=false`, redeploy, and complete one controlled write.

Stripe webhooks and protected scheduled monitoring remain active during read-only mode so subscription state and operational alerts are retained.

## Restore exercise

Perform a restore exercise before launch and at least quarterly:

1. Restore into an isolated recovery project or approved branch, never over production for a test.
2. Restore sample private Storage objects under their original organisation/client paths.
3. Use test identities for two organisations.
4. Confirm organisation A cannot read organisation B records or files in both directions.
5. Verify counts for clients, notes, incidents, documents, shifts, agreements and invoices.
6. Verify signed URLs require authorised active organisation membership.
7. Record recovery time, missing objects, errors and corrective actions.
8. Delete the isolated recovery environment after evidence is retained securely.

## Incident response

- Do not delete or recreate the production project.
- Enable read-only mode if writes could worsen the incident.
- Preserve Vercel and Supabase Auth, API, Postgres and Storage logs.
- Identify the last known-good database time and matching Storage snapshot.
- Contact Supabase Support before restoring production if the recovery point is uncertain.
- Notify affected organisations according to applicable privacy and incident obligations.

Official reference: https://supabase.com/docs/guides/platform/backups
