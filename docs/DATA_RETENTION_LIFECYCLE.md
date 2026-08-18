# Data retention lifecycle

EmpowerNotes uses a review-first lifecycle. A record reaching its configured age does not cause deletion. It creates an owner-visible candidate that must be assessed against legal, safeguarding, funding, employment, dispute and jurisdictional requirements.

## Workflow

1. An owner or full administrator reviews the seeded draft schedules under **Admin > Settings > Retention and legal holds**.
2. The organisation records its basis and approves, pauses or changes each schedule.
3. The weekly protected job scans only approved schedules and adds due records to the review queue.
4. An active organisation-wide, participant-specific or record-class legal hold blocks approval.
5. The owner records a reason to mark a record reviewed, exempt it, or approve the proposed action.
6. De-identification and deletion approvals create auditable action jobs. Execution remains disabled until backup/restore evidence and an approved operating procedure exist.

## Seeded review points

- Incident and restrictive-practice records: 7 years, based on NDIS incident record guidance.
- Workforce records: 7 years, based on Fair Work time and wage record requirements.
- Billing records: 5 years, based on NDIS payment-evidence guidance.
- Care and document records: 7-year draft review points only. Providers must assess their service type and state or territory obligations before approval.

These are configuration starting points, not legal conclusions. Different documents and circumstances may require longer retention. Active incidents, complaints, investigations, claims, litigation, safeguarding matters and other lawful holds override disposal.

## Privacy boundary

The queue stores identifiers, classes and dates, not note narratives, diagnoses or document contents. It is tenant scoped, restricted to owners/full administrators, protected by password sign-in and role permissions, and unavailable to anonymous or ordinary authenticated roles.

## Deployment

1. Confirm current database and private Storage backups.
2. Apply `supabase/data-retention-lifecycle.sql` after the membership hardening migration.
3. Run Supabase security and performance advisors.
4. Redeploy so the weekly `/api/cron/retention-review` job is registered.
5. Approve schedules only after organisational policy review.

## Primary references

- OAIC APP 11: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information
- NDIS incident management: https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/incident-management
- NDIS provider record keeping: https://www.ndis.gov.au/providers/working-provider/reporting-and-recording-keeping/what-are-record-keeping-requirements
- Fair Work record keeping: https://www.fairwork.gov.au/pay-and-wages/paying-wages/record-keeping
