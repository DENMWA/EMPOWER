# Progress Analytics Permissions

Suggested permissions:

- `plans.upload`
- `plans.view`
- `plans.review_extractions`
- `plans.verify`
- `baselines.create`
- `baselines.verify`
- `goal_evidence.create`
- `goal_evidence.verify`
- `progress.view`
- `progress.manage`
- `progress.export`
- `progress.configure`
- `analytics.view_participant`
- `analytics.view_service`
- `analytics.view_organisation`

Organisation-wide analytics must only include participants the user is permitted to access, unless the user has an approved aggregated analytics role.

Workers can view assigned participant evidence. Managers can verify baselines and evidence. Organisation analytics should be restricted to admin, owner and approved management roles.
