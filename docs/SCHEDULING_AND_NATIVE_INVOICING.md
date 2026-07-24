# Scheduling and Native NDIS Invoicing

EmpowerNotes now includes an admin-only MVP workflow for scheduling, service agreements, NDIS pricing versions and native invoice drafts without requiring Xero, MYOB or QuickBooks.

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

## Production TODOs

- Apply `supabase/scheduling-native-invoicing.sql`.
- Add full RLS policies for each table using the existing organisation/role helpers.
- Replace local-storage billing records with Supabase-backed records.
- Implement XLSX/CSV parser for official NDIA support catalogue imports.
- Add admin review UI for pricing diffs.
- Add formal invoice approval permissions.
- Add audit event writes.
- Add automated tests for agreement, shift, invoice, evidence, duplicate and budget flows.
