# EmpowerNotes marketing attribution

EmpowerNotes records a small first-party acquisition funnel for public pages. Internal records are canonical. Advertising platforms are disabled downstream adapters until separately configured and reviewed.

## Funnel

Public visitor -> pricing view -> signup started -> signup completed -> Stripe-confirmed subscription.

## Identity and attribution

- `empower_visitor_id` is a random UUID retained for 180 days.
- `empower_session_id` is a random UUID refreshed after 30 minutes of inactivity.
- First touch preserves UTMs, referrer, landing path, `gclid`, and `oppref`.
- A later identifiable touch is recorded separately; direct internal navigation does not replace first touch.
- No fingerprinting, identity enrichment, participant data, clinical data, or form contents are collected.

## Privacy boundary

Capture runs only on `/`, `/features`, `/pricing`, `/contact`, and `/signup`. It does not run on authenticated operational routes. Supabase tables have RLS enabled and no `anon` or `authenticated` table privileges. Server routes use the service role; platform reporting requires the configured platform owner.

Metadata uses a positive allowlist: `plan` and `providerType`. External adapters must never receive arbitrary metadata. Google and OpenAI delivery statuses remain `disabled` in V1.

## Configuration

Set both variables in Vercel Production and Preview, then redeploy:

```
MARKETING_ATTRIBUTION_ENABLED=true
NEXT_PUBLIC_MARKETING_ATTRIBUTION_ENABLED=true
```

Run `supabase/marketing-attribution-v1.sql` once. The public variable enables browser capture; the server variable enables canonical storage. Core product actions continue if marketing storage fails.

## Reporting

The developer console shows the last 30 days by source: OpenAI Ads, Google Ads, organic, direct, referral, other paid, and other. Internal and ad-platform figures may differ because of consent, storage restrictions, click matching, and platform attribution windows.

## Future adapters

Outbound Google Ads and OpenAI Ads adapters should be added only after current official specifications, account configuration, consent requirements, and deduplication rules are confirmed. Internal conversion IDs are already stable (`signup_completed:<user_id>` and `subscription_started:<subscription_id>`).
