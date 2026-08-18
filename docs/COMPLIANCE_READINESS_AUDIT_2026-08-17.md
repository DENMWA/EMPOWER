# EmpowerNotes Compliance Readiness Audit

Date: 17 August 2026

## Scope

This engineering review assessed the application, API routes, Supabase security posture, private storage, tenant isolation, authentication, auditability, AI data handling, billing boundaries, recovery documentation, and automated tests. It supports compliance readiness; it is not legal advice, an NDIS certification, a privacy impact assessment, or a penetration test.

## Release blockers

1. **Privileged MFA live evidence is pending.** Application step-up and restrictive AAL2 RLS are implemented. Apply `supabase/privileged-mfa-rls.sql` to the connected project, enrol disposable privileged identities, and record successful AAL1 denial/AAL2 access checks before broad production rollout.
2. **Backup and restore evidence is incomplete.** Database backup/PITR settings, encrypted Storage backup, and a successful restore exercise must be recorded. Database backups alone do not restore deleted Storage objects.
3. **Retention execution evidence is pending.** Organisation-approved schedules, weekly review scanning, legal holds, auditable exceptions and controlled action jobs are implemented. Destructive execution remains intentionally disabled until backup/restore evidence and an approved operating procedure exist.
4. **Live two-tenant regression evidence is pending.** The five tests now have fail-closed project, disposable-data, credential, storage-path, and mutation guards, but still require dedicated test identities and one recorded successful run.

## High-priority hardening

- Enable Supabase leaked-password protection.
- Apply the reviewed function grants and fixed search paths in the compliance migration.
- Retain the participant-document bucket as private and apply the proposed 10 MB/MIME restrictions.
- Replace browser-readable authentication persistence if a future threat model requires stronger protection against XSS. Until then, keep CSP strict and remove `unsafe-inline` when the framework migration permits it.
- Commission an independent penetration test covering tenant isolation, invitation flows, IDOR, storage paths, privilege escalation, and billing webhooks.

## Defects corrected in this review

- Roster replacement links no longer accept or decline a shift through GET. Email scanners and link previews can only open a confirmation page; the state change requires POST.
- Public marketing telemetry can no longer submit authoritative signup or subscription conversion events or attach user/organisation identifiers.
- OpenAI Chat Completions requests explicitly disable provider-side response storage.
- Product policy wording no longer claims that privileged MFA is already implemented.
- A controlled Supabase migration removes the known over-broad incident policies, revokes anonymous privileged RPC access, fixes mutable function search paths, and constrains document uploads.
- The incident-report hardening migration was applied and its policy, function-grant, search-path, bucket, size, and MIME checks were verified.
- Live two-tenant checks now fail closed unless the exact project, disposable organisations, credentials, file path and mutation intent are confirmed.
- Data lifecycle controls now queue due records for review, enforce legal holds and record approved action jobs without automatically erasing customer data.

## Controls verified

- Every live public table has RLS enabled.
- The participant-document Storage bucket is private.
- Server-side access resolves an active organisation membership and permission scope; a browser organisation pointer is not authoritative.
- Platform administration requires both an owner role and an allow-listed platform owner email.
- Private file links are short-lived, participant/organisation scoped, and audited.
- Stripe-hosted Checkout keeps card entry outside EmpowerNotes application servers.
- Security headers include HSTS, frame denial, MIME sniffing protection, referrer restrictions, a permissions policy, and CSP.
- Audit and review workflows exist for notes, incidents, documents, subscriptions, and platform operations.
- Marketing and AI discoverability resources exclude participant data.

## Operational evidence still required

- Signed privacy impact assessment and data-flow inventory.
- Current subprocessor register and contracts for Supabase, Vercel, Stripe, Resend, and OpenAI.
- Documented Notifiable Data Breaches response exercise and NDIS incident escalation exercise.
- Restore test evidence with measured recovery time and recovery point.
- Access review evidence for owners, admins, managers, staff, suspended users, and organisation switching.
- Stripe SAQ A determination and required ecommerce vulnerability scanning evidence.
- Dependency vulnerability report; the npm advisory registry was unavailable during this review.
- Mobile device verification for microphone denial/failure and accessibility testing with assistive technology.

## Authoritative references

- OAIC Australian Privacy Principles: https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles
- OAIC Guide to Health Privacy: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy
- NDIS incident management: https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/incident-management
- NDIS reportable incidents: https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/reportable-incidents
- PCI DSS SAQ A guidance: https://www.pcisecuritystandards.org/faqs/1604/
- Stripe integration security: https://docs.stripe.com/security/guide

## Verification result

- TypeScript: passed
- Automated tests: 114 passed, 5 live environment-dependent tests skipped in the ordinary no-network run
- SQL safety: passed for 66 SQL files
- Secret-pattern review: no committed production secret found
- Dependency advisory scan: unavailable because the npm advisory registry could not be reached

**Verdict:** suitable for controlled testing with synthetic data after the incident-policy migration. Not yet ready to claim full legal, NDIS, privacy, or security compliance with real participant data until the release blockers and operational evidence above are closed.
