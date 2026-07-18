# Plan Parsing And Verification

Plan uploads must use private storage and organisation-scoped paths:

`participant-plans/{organisation_id}/{participant_id}/{plan_id}/{filename}`

AI may extract:

- Goals
- Support needs
- Risks
- Support strategies
- Communication preferences
- Baseline indicators
- Review dates

Every extraction keeps source page, source section, confidence score and review status. The app must not create a verified participant baseline until an authorised user approves or edits the extraction.

Verification statuses:

- `pending`
- `approved`
- `edited`
- `rejected`

Rejected extractions should retain the rejection reason for audit history.
