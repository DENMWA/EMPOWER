# Platform Discoverability Intelligence

The owner-only Discoverability workspace combines verified search data with clearly labelled AI visibility signals. It never reads tenant workspaces or participant data.

## Metric sources

- Google impressions, clicks, click-through rate and position come from the authorised Google Search Console API.
- AI referrals come from EmpowerNotes first-party marketing attribution and external referrer hosts.
- Public discovery health checks request `llms.txt`, the AI manifest, OpenAPI, the public capability API and MCP registry.
- Crawler counts are populated from `platform_ai_crawler_events` after a Vercel log drain or equivalent server-log pipeline is configured.
- Citation coverage is calculated only from repeatable checks recorded in the citation ledger. It is not presented as total AI impressions.

## Setup

1. Run `supabase/platform-discoverability-intelligence.sql` in the EmpowerNotes Supabase project.
2. Create a Google OAuth client with read-only Search Console access and obtain a refresh token for an owner of `sc-domain:empowernotes.org`.
3. Add the four `GOOGLE_SEARCH_CONSOLE_*` values from `.env.example` to Vercel Production and Preview.
4. Redeploy and open Developer Console > Discoverability.
5. Optionally connect a Vercel log drain that writes recognised crawler requests into `platform_ai_crawler_events` through a restricted server-side ingestion process.

Do not put OAuth secrets in `NEXT_PUBLIC_*` variables. A Bing key only reports integration readiness until a verified Bing import or API adapter is configured.

## Interpretation

Search Console data can be delayed and may return only top rows. AI platforms generally do not expose complete impression data. The console therefore keeps verified search performance, observed referrals, crawler requests and monitored citation coverage as separate metrics.

The citation ledger should reuse a stable set of public prompts. Record the platform, exact prompt, result, cited URL and position. Do not enter client, organisation, staff or operational data.
