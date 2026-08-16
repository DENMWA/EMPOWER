# EmpowerNotes AI Discoverability

## Purpose

The discoverability layer gives search engines and AI systems a consistent, public description of EmpowerNotes without exposing customer workspaces or operational APIs.

## Source of truth

`lib/ai-discoverability.ts` contains the approved public product profile, capability descriptions, plan projection, progress-note FAQs and explicit data boundary. Generated discovery resources must use this module instead of maintaining separate marketing claims.

## Public surfaces

| Surface | Purpose |
| --- | --- |
| `/llms.txt` | Concise, human-readable product context for language models and agents |
| `/.ai/manifest.json` | Machine-readable discovery manifest |
| `/openapi.json` | OpenAPI 3.1 description of deliberately public discovery endpoints only |
| `/api/public/capabilities` | Versioned public product, capability and plan information |
| `/api/mcp` | Read-only MCP stub for public product discovery |
| `/ai-progress-notes` | Source-backed informational landing page for AI-assisted progress notes |

## Structured data

The root layout publishes `Organization` and `WebSite` entities. The homepage publishes `SoftwareApplication`; features publishes `ItemList`; pricing publishes `Product` and `Offer`; and the AI progress-notes page publishes `SoftwareApplication`, `FAQPage` and `BreadcrumbList`.

Structured data must reflect visible page content. Do not add ratings, reviews, regulatory approval, compliance certification or pricing claims that are not publicly supported.

## Privacy boundary

Public discovery code must never import tenant data modules or access Supabase. It must not expose:

- participant or client records;
- progress notes, incidents, diagnoses or support documents;
- organisation, house or staff records;
- authentication or billing internals;
- private API route names, schemas or diagnostic details.

The MCP endpoint is intentionally read-only and has only three public tools. It must not be extended to customer workspace data without a separate authenticated architecture, threat model and security review.

## OpenAPI boundary

`openapi.json` documents only `/api/public/capabilities` and the public MCP stub. Existing care, admin, AI, billing, authentication, subscription, diagnostics, Stripe and platform endpoints are private implementation surfaces and must not be added.

## Maintenance

1. Update approved public claims in `lib/ai-discoverability.ts`.
2. Confirm matching visible copy on the relevant marketing page.
3. Update the fixed `updatedAt` date when public discovery content materially changes.
4. Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`.
5. Check `/llms.txt`, `/.ai/manifest.json`, `/openapi.json`, `/api/public/capabilities` and `/api/mcp` after deployment.
6. Validate JSON-LD with a structured-data validator and inspect canonical URLs on production.

## MCP evolution

The current MCP endpoint is a capability registry and read-only protocol stub. Future versions may add richer public documentation resources. Any authenticated MCP capability must be a separate project with explicit organisation resolution, user consent, least-privilege scopes, audit logging, rate limits and strict participant-data controls.
