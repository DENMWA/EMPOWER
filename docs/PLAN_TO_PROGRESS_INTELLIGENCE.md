# Plan-to-Progress Intelligence

EmpowerNotes connects every verified participant plan, support note and outcome into a traceable evidence record that shows progress over time.

## Workflow

1. Participant plan is uploaded to private storage.
2. AI parses goals, strategies, support needs and risks.
3. Authorised staff review every extraction.
4. Verified participant goals and baselines are created.
5. Future notes are matched to verified goals.
6. Evidence is compared with baseline.
7. AI suggests cautious progress classification.
8. Authorised staff confirm or reject classification.
9. Progress timeline, charts and reports update.

AI output is never authoritative until reviewed. AI must not mark `Goal Achieved`, `Sustained Progress` or `Regression Concern` without authorised confirmation.

## Current Implementation

The current app includes a Phase 1 demo implementation:

- Central subscription entitlement framework.
- Participant progress route at `/participants/progress`.
- Human verification queue display.
- Verified baseline and evidence trend demo.
- Evidence strength scoring with explanation.
- Accessible chart with data table.
- Admin settings panel for progress intelligence.
- Supabase schema for plans, extractions, goals, baselines, evidence, progress scales and usage.

## Remaining Production Work

- Server-side plan upload and file validation.
- PDF/DOCX parsing workers.
- AI extraction API routes.
- Real Supabase CRUD for plan review.
- Server-enforced entitlements and usage metering.
- Production tests and background job processing.
