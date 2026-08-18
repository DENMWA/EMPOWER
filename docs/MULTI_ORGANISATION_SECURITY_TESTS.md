# Multi-organisation security tests

The normal test run verifies local security contracts and never contacts Supabase. The live suite proves that an authenticated user in Organisation A cannot read Organisation B rows, sign Organisation B files, or switch into Organisation B.

Use a dedicated test project or clearly named disposable organisations. Never use genuine participant records.

## Read-only test setup

Create `security-fixtures.local.json` in the repository root. This filename is ignored by Git.

```json
{
  "fixturePurpose": "disposable-security-test",
  "url": "https://PROJECT_REF.supabase.co",
  "anonKey": "TEST_PROJECT_ANON_KEY",
  "orgAEmail": "DISPOSABLE_ORG_A_USER_EMAIL",
  "orgAPassword": "DISPOSABLE_ORG_A_USER_PASSWORD",
  "orgAId": "ORG_A_UUID",
  "orgBId": "ORG_B_UUID",
  "participantBId": "ORG_B_PARTICIPANT_UUID",
  "invoiceBId": "ORG_B_INVOICE_UUID",
  "documentBId": "ORG_B_DOCUMENT_UUID",
  "houseBId": "ORG_B_SERVICE_LOCATION_UUID",
  "documentBPath": "ORG_B_UUID/PARTICIPANT_UUID/report/test-file.pdf"
}
```

The Org A account must be active and point to Org A. Use a disposable manager role so password sign-in is sufficient for the test while role and tenant checks remain active. All Org B identifiers must exist so an empty result proves RLS denial rather than a missing test record. The document must exist in the private `participant-documents` bucket.

In PowerShell, confirm the exact target project and run the read-only checks:

```powershell
$env:EMPOWERNOTES_SECURITY_FIXTURES_FILE = ".\security-fixtures.local.json"
$env:EMPOWERNOTES_SECURITY_TEST_CONFIRM_PROJECT_REF = "PROJECT_REF"
npm run test:tenant-live
```

The runner signs in the disposable Org A account to obtain a fresh access token. A short-lived `orgAToken` may be used instead of the email and password, but stored credentials are easier to repeat safely in an isolated project.

## Suspension and downgrade tests

These checks temporarily suspend and downgrade the Org A membership, verify that access changes on the next request, and restore the exact live membership snapshot in `finally`.

Add these fields to the fixture file:

```json
{
  "orgAMembershipId": "ORG_A_MEMBERSHIP_UUID",
  "testOrganisationNamePrefix": "E2E - "
}
```

Both Organisation A and Organisation B names must begin with that prefix. Then set the test-project service key only for the current terminal and run:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "TEST_PROJECT_SERVICE_ROLE_KEY"
$env:EMPOWERNOTES_MUTATION_TEST_CONFIRMATION = "I_UNDERSTAND_THIS_MUTATES_DISPOSABLE_DATA"
npm run test:tenant-live:mutations
```

The runner refuses to start when the project confirmation, disposable marker, UUIDs, path ownership, credentials, service key, mutation phrase, or organisation-name guard is missing. It never prints credentials or keys.
