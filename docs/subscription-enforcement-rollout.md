# Subscription Enforcement Rollout

EmpowerNotes separates feature visibility, usage monitoring, and database enforcement. Apply enforcement progressively so existing test data is not unexpectedly blocked.

## 1. Apply the database migration

Run `supabase/production-subscription-enforcement.sql` in the connected EmpowerNotes Supabase project. The migration is additive and leaves every organisation in its existing enforcement mode. New organisations still start in `monitor` mode.

## 2. Verify installation

Run `supabase/verify-production-subscription-enforcement.sql`. Confirm:

- All three functions and the readiness view are present.
- Subscription write triggers appear on organisation-owned tables.
- Limit triggers appear on clients, users, houses, documents, service agreements, and invoice lines.
- Solo, Practice, Provider, and Enterprise limits match the product catalogue.

## 3. Deploy the application

Deploy the commit containing the server entitlement endpoint, AI quota guard, Stripe grace-period handling, file-size metadata, and document upload sequencing. Apply the migration first because the deployed document queries expect `documents.file_size_bytes` to exist.

## 4. Exercise monitor mode

Keep the test organisation in `monitor` while testing each workflow. Exceed a low-risk limit with test records and confirm a row appears in `entitlement_observations` with `would_block = true`.

Monitor mode records the decision but permits the action. Feature screens such as team management and audit packs still follow their plan catalogue because they do not consume or destroy existing data.

## 5. Review readiness

Query:

```sql
select *
from public.subscription_enforcement_readiness
order by organisation_name;
```

Resolve unexpected would-block observations before enforcement. Verify the organisation has the intended tier, an active or unexpired trial status, and realistic usage counts.

## 6. Enforce one test organisation

```sql
begin;
select set_config('app.subscription_update_authorised', 'true', true);
update public.organisations
set subscription_enforcement_mode = 'enforce'
where id = '<test organisation uuid>'
  and subscription_status in ('trialing', 'active');
commit;
```

Test plan limits, AI allowances, expired access, Stripe checkout, payment failure, the seven-day grace period, cancellation, viewing existing records, and exports.

## 7. Recovery

Return an organisation to monitoring from the trusted SQL editor:

```sql
begin;
select set_config('app.subscription_update_authorised', 'true', true);
update public.organisations
set subscription_enforcement_mode = 'monitor'
where id = '<organisation uuid>';
commit;
```

For a controlled data repair within one transaction, a trusted database operator may use:

```sql
select set_config('app.subscription_write_bypass', 'true', true);
```

Never expose this bypass through client code or an authenticated-user RPC.
