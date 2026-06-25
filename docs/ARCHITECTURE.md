# Architecture

## Frontend

The app uses Next.js App Router with route-level pages under `app/` and reusable modules under `components/`. Demo data is stored in `lib/sample-data.ts`; mock AI and evidence services live in `lib/ai-mock.ts`, `lib/document-intelligence.ts`, and `lib/invoice-readiness.ts`.

## Data Model

The Supabase schema includes organisations, users, participants/clients, assignments, goals, progress notes, incidents, scores, approvals, audit logs, documents, summaries, templates, voice sessions, invoice evidence checks, and invoice summaries.

## Auth and Roles

Roles include support worker, team leader, case manager, service manager, admin, owner, and sole provider. Billing components are only rendered for owner, admin, and service manager roles in the demo shell.

## Document Security

Documents must be stored in private Supabase Storage buckets. Workers should only see worker-visible documents for assigned participants. Manager-only documents and extracted AI summaries require manager/admin access.

## AI Service Architecture

Production AI calls should use server routes or server actions. Client components call local mock functions today; replace those with server-backed functions before live use.

## Audit Logging

Audit logs should capture note creation, voice note creation, read-back, AI improvement, review submission, approvals, send-backs, self-certification, locking, invoice readiness, invoice summary generation, incident creation, and document events.

## MVP Limitations

Authentication, live Supabase queries, document parsing, transcription, PDF generation, and payment processing are placeholders.

## Production TODOs

- Connect Supabase Auth and replace sample data with queries.
- Move AI calls behind server-only endpoints.
- Add private Storage upload/download flows.
- Add PDF/Word export service.
- Add confirmation modals for high-impact actions.
- Perform legal, privacy, security, and NDIS compliance review.
