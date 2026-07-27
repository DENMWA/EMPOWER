# Scheduling and Native NDIS Invoicing

EmpowerNotes includes an admin-only workflow for scheduling, service agreements, NDIS pricing versions and native invoice drafts without requiring Xero, MYOB or QuickBooks.

## Phase 1 Cloud Persistence

Signed-in organisations now load and save scheduling and billing records through Supabase. Browser storage remains only as an immediate UI cache and demo fallback.

Apply the SQL files in this order:

1. `supabase/schema.sql`
2. `supabase/fix-users-rls-recursion.sql`
3. `supabase/scheduling-native-invoicing.sql`
4. `supabase/scheduling-native-invoicing-phase1.sql`

The Phase 1 migration:

- adds organisation ownership to tenant-imported pricing versions and pricing diffs
- permits authenticated users to read active platform pricing
- keeps tenant pricing drafts private to their organisation
- restricts pricing management to admin, owner and sole-provider roles
- restricts invoices and invoice lines to billing-management roles
- allows assigned workers to view relevant shifts without exposing finance records
- supports scheduling staff invites before the invited worker completes registration
- applies insert, update and delete checks using server-resolved organisation identity
- adds uniqueness controls for shift assignments, note links and invoice numbers

The client never sends a trusted organisation selection. The cloud repository resolves the current organisation from the authenticated user before writing.

## Workflow

1. Admin imports a manual NDIS pricing draft.
2. Admin reviews and activates the pricing version.
3. Admin creates a participant service agreement.
4. Admin adds an agreement item with agreed rate, selected support item and budget allocation.
5. Admin schedules a support shift.
6. Admin marks the shift completed and links a saved progress note where available.
7. EmpowerNotes creates a native invoice draft from the completed shift.
8. Invoice lines store the support item, pricing version, price limit, agreed rate, evidence status and price-check status used at the time.
9. Admin exports the invoice as branded HTML/PDF-ready content and CSV.
10. Admin tracks payment status and budget usage.

## Pricing Versioning

NDIS pricing must be treated as versioned data. The MVP supports manual pricing draft creation and admin activation. Imported pricing starts as `draft`; activation changes the selected version to `active` and marks prior active versions as `superseded`.

Historical invoice lines store the pricing version name, pricing version ID, NDIS price limit and agreed rate used at creation time. They must not be recalculated from newer pricing versions.

## Evidence and Price Checks

Invoice lines are flagged as:

- `evidence_linked` when a completed shift has a saved note reference.
- `missing_note` when a completed shift has no linked support note.
- `within_limit` when agreed rate is not above the selected price limit.
- `over_limit` when agreed rate exceeds the selected price limit.
- `manual_review_required` when pricing data is incomplete.

Missing evidence does not erase the invoice draft. It creates a review signal.

## Duplicate Billing

The MVP checks existing invoice lines for the same source shift. If found, the invoice line is marked as needing correction with `Possible duplicate billing detected`.

## Budget Tracking

Budget usage is calculated from invoice lines against the service agreement item budget allocation. Warnings are shown at 75%, 90% and exceeded.

## Exports

Native exports include:

- branded HTML/PDF-ready invoice export
- CSV with stable accountant/plan-manager columns

Private progress note text is not embedded in invoices by default. The invoice shows support note and shift references only.

## Accounting Integrations

Xero, MYOB and QuickBooks are not required for the MVP. No live accounting sync is implemented. Placeholder mapping files exist only to keep the architecture ready for future optional integrations.

## Remaining Production TODOs

- Implement XLSX/CSV parser for official NDIA support catalogue imports.
- Add admin review UI for pricing diffs.
- Add formal invoice approval permissions.
- Add audit event writes.
- Add automated tests for agreement, shift, invoice, evidence, duplicate and budget flows.
- Add deletion/archive reconciliation for records removed after initial cloud sync.
