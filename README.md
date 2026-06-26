# Empower Notes

Empower Notes is an AI-assisted documentation and compliance-quality SaaS MVP for disability support, social work, youth work, NDIS providers, sole providers, managers, and provider owners.

It demonstrates voice-to-compliant-documentation: workers can type or dictate rough notes, run a guided voice interview, improve wording, score audit readiness, check missing details, suggest goal links, prepare incident summaries, verify document evidence, and review invoice-readiness.

## Features

- Manager and worker dashboards
- Lightweight roster with day/week views, employee colours, shift status, and progress-note tracking
- Participant/client profiles and staff sample data
- Progress note generator with mock AI improvement
- Guided Voice Documentation with transcript preview and SpeechSynthesis read-back
- AI note quality score, missing-detail checker, person-centred rewrite, and goal suggestions
- Incident report assistant with required escalation wording
- Manager approval workflow and sole-provider self-certification placeholders
- Document Vault and AI Evidence Reader with manager verification messaging
- Evidence-based invoice-readiness checks and simple invoice summaries
- Audit Pack Generator and PDF export placeholders
- Public pricing page, founding offer, plan comparison, and FAQ
- Admin-only billing/plan display components
- Accessibility Mode toggle with larger touch targets and persisted local preference

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Mock AI service layer ready to replace with OpenAI or Anthropic server-side calls
- Supabase schema and RLS policy draft in `supabase/schema.sql`

## Local Setup

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Environment Variables

The demo runs without these keys. Production should configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`

AI keys must stay server-side. Do not expose service role keys or AI keys to the client.

## Supabase Setup

Use `supabase/schema.sql` as the starting migration. It defines organisations, users, participants/clients, assignments, goals, progress notes, roster shifts, incidents, note scores, approvals, audit logs, documents, document AI summaries, document-note links, templates, voice sessions, invoice evidence checks, and invoice summaries.

Private storage buckets to create:

- `participant-documents`
- `note-exports`
- `audit-packs`

No public document URLs should be used.

## AI Service Notes

All AI behaviour is mocked in `lib/ai-mock.ts`. Production calls should be implemented through server routes or server actions only. The AI must not invent facts, must list missing details, must use objective language, and must not make final legal or compliance decisions.

Required escalation wording:

> This may require manager review for possible escalation or reportable incident assessment.

## Voice Feature Notes

The MVP includes a mock recording flow and browser `SpeechSynthesis` read-back. Production can add browser `SpeechRecognition` where available and a server-side transcription endpoint for uploaded audio.

## Accessibility Mode

Accessibility Mode is persisted in local storage and increases the interface size and touch target comfort. Production should persist this preference on the user profile and add confirmation modals for high-impact actions.

## Document Vault

The MVP stores document metadata only. Production should use private Supabase Storage, server-side document processing, audit logs for upload/view/download/delete, manager-only visibility, and explicit verification before extracted AI information is authoritative.

## Invoice-readiness

The MVP checks whether evidence appears ready. It does not perform accounting, payroll, claiming, or payment processing.

## Roster

Roster is a lightweight shift planning and documentation-tracking feature. It is not payroll, award interpretation, accounting, NDIS claiming automation, or a full workforce management system. See `docs/ROSTER.md` for details.

## Pricing

Pricing is static. Stripe checkout is intentionally not connected yet; billing components mark where production checkout can be added.

## Compliance Disclaimer

Empower AI assists with documentation quality, wording, prompts, and evidence organisation. It does not replace professional judgement, clinical judgement, legal advice, safeguarding assessment, or NDIS compliance obligations.

## Deployment

Deploy to Vercel or Railway after configuring environment variables and Supabase. Run `npm run typecheck`, `npm run lint`, and `npm run build` before release.

## Known Limitations

- Authentication is not connected.
- AI, transcription, PDF export, and document extraction are mocked.
- Supabase policies are a production starting point and need project-specific review.
- No Stripe, full invoicing, payroll, full workforce management, or accounting is implemented.
