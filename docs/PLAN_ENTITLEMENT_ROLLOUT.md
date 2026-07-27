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

