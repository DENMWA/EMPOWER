# Plan Entitlement Rollout

EmpowerNotes plan enforcement is being introduced in stages so existing records and workflows remain available.

## Phase 1: Catalogue and Monitoring

Phase 1 adds:

- a unified catalogue facade in `lib/subscriptions/catalog.ts`
- plan usage evaluation in `lib/subscriptions/monitor.ts`
- house, invoice, service agreement and operational entitlements
- additive subscription and usage columns in Supabase
- a server-owned entitlement observation table
- an organisation enforcement mode that defaults to `monitor`

Phase 1 does not connect the new catalogue to blocking controls. Existing client, note, incident, document, reporting, scheduling and billing behaviour remains unchanged.

Apply:

1. `supabase/schema.sql`
2. `supabase/fix-users-rls-recursion.sql`
3. `supabase/subscription-gating.sql`
4. `supabase/subscription-entitlements-phase1.sql`

For an existing database, only run migrations that have not already been applied. Each Phase 1 statement is additive or repeatable.

## Safety Rules

- Incident creation is never disabled by a plan.
- Existing records remain readable and exportable after downgrade.
- A downgrade never deletes records.
- Limits stop new usage only after enforcement is explicitly enabled.
- Browser-selected tiers are not a production authority.
- Stripe webhooks and the organisation subscription record will become the authority in a later phase.
- Entitlement observations are written by trusted server code, not by the browser.

## Rollout Order

1. Keep every organisation in `monitor`.
2. Resolve the authenticated organisation and tier on the server.
3. Record decisions for client, user, house, AI, storage and invoice usage.
4. Review false positives and role behaviour.
5. Connect Stripe webhook subscription updates.
6. Enable enforcement for one low-risk resource at a time.
7. Remove browser-controlled production gating last.

To confirm that no organisation is enforcing limits:

```sql
select id, name, subscription_tier, subscription_status, subscription_enforcement_mode
from public.organisations
order by created_at desc;
```

Every row should show `monitor` during Phase 1.

## Phase 2: Authenticated Server Resolution

Phase 2 adds authenticated subscription resolution to the AI note and plan parsing APIs:

- the browser sends the existing Supabase access token as a bearer token
- the server validates the session with Supabase Auth
- the server resolves the user's organisation through tenant RLS
- the organisation's subscription tier and enforcement mode become the canonical API context
- monitor decisions are written to `entitlement_observations` when the service role key is available
- the legacy browser tier remains a temporary fallback if resolution is unavailable

Fallback resolution always uses `monitor`, so a missing migration, expired session or temporary Supabase error cannot unexpectedly block an existing action during Phase 2.

API responses expose only:

- `entitlementSource`: `supabase` or `legacy-fallback`
- `enforcementMode`: `monitor` or `enforce`
- the public plan name

Tokens, user identifiers and organisation identifiers are never returned in entitlement diagnostics.

Review recent monitoring decisions with:

```sql
select
  observed_at,
  subscription_tier,
  resource,
  would_block,
  enforcement_mode,
  metadata
from public.entitlement_observations
order by observed_at desc
limit 100;
```

## Phase 3: Live Usage and Protected Subscription State

Phase 3 adds:

- an admin-only `/api/subscription/usage` endpoint
- a service-role-only Supabase usage aggregation function
- live counts for clients, users, houses, documents, AI requests, storage, invoice lines, and service agreements
- canonical plan, status, monitoring mode, and trial/renewal information in the admin billing screen
- a local estimate fallback when the live snapshot is temporarily unavailable
- removal of customer-facing tier testing selectors
- a one-time trusted RPC for configuring the signup trial
- database protection against direct browser updates to paid subscription fields

Apply `supabase/subscription-entitlements-phase3.sql` after the Phase 1 migration and scheduling/native invoicing schema.

Deploy the application code before applying the Phase 3 SQL so new signups use the trial configuration RPC. The code temporarily falls back to the previous setup request until the migration is available.

The following fields become trusted billing fields:

- `subscription_tier`
- `subscription_status`
- `subscription_current_period_end`
- `subscription_grace_ends_at`
- `subscription_enforcement_mode`
- `stripe_customer_id`
- `stripe_subscription_id`

After Phase 3, these fields can be changed only by the initial-trial RPC or trusted service-role code such as the future Stripe webhook.
