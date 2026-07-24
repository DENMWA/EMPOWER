# Accounting Integration Roadmap

The MVP uses native EmpowerNotes invoicing.

EmpowerNotes creates:

- invoice draft
- invoice line evidence references
- selected pricing version snapshot
- PDF-ready export
- CSV export
- payment status tracking

No Xero, MYOB or QuickBooks account is required at launch.

## Current State

- `nativeAccountingProvider` returns a no-op success message.
- Xero, MYOB and QuickBooks mapper files exist as placeholders only.
- Native PDF/CSV export is the supported billing path.

## Future Provider / Enterprise Hooks

Future integrations can map native invoice records to:

- Xero invoice payloads
- MYOB invoice payloads
- QuickBooks invoice payloads
- payment-status sync jobs
- accounting code mapping

Future integrations must not replace native invoice storage. EmpowerNotes should remain the operational source of scheduling, evidence and invoice history.
