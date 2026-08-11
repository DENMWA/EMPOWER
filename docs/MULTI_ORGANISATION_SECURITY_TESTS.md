# Multi-organisation security tests

The default test run validates the security contracts without contacting production services.

Live RLS tests require a dedicated, disposable Supabase test project and:

- `RUN_SUPABASE_INTEGRATION_TESTS=1`
- `EMPOWERNOTES_SECURITY_FIXTURES` containing the test project URL, anon key, Org A user token, Org B IDs, and test resource IDs

Suspension and downgrade tests additionally require:

- `RUN_SUPABASE_MUTATION_TESTS=1`
- a service-role key and a dedicated Org A membership ID in the fixture JSON

Never enable mutation tests against production. The tests restore changed membership state in `finally`, but isolated fixtures remain mandatory.
