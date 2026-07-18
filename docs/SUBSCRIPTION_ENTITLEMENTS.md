# Subscription Entitlements

Plan-to-Progress Intelligence is controlled by central entitlements in:

- `lib/subscriptions/tiers.ts`
- `lib/subscriptions/entitlements.ts`
- `lib/subscriptions/limits.ts`
- `lib/subscriptions/check-entitlement.ts`

Tiers:

- EmpowerNotes Solo
- EmpowerNotes Team
- EmpowerNotes Growth
- EmpowerNotes Enterprise

`null` limits are displayed as `Contract-based allowance`, not as automatic unlimited usage.

Downgrade behaviour:

- Existing records remain visible.
- Existing exports remain available.
- Advanced configurations become read-only.
- New usage above the downgraded limit is stopped.
- Data is not deleted automatically.
