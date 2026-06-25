# AI Prompt Contracts

All AI calls must run server-side. If keys are missing, use mock services. Uploaded documents must not be used for model training.

## Shared Rules

- Do not invent facts.
- Clearly list missing details.
- Use objective, observable, person-centred language.
- Do not make final legal, clinical, safeguarding, or compliance decisions.
- Do not state that something is definitely a reportable incident.
- When risk is identified, use: "This may require manager review for possible escalation or reportable incident assessment."

## Improve Rough Note

Input: participant/client context, goals, support type, rough note, voice transcript, date/time if known.

Output sections: support provided, participant/client presentation, staff action, participant/client response, outcome, follow-up required, suggested goal link.

Instruction: preserve uncertainty and keep original details auditable.

## Score Note Quality

Score audit readiness, objective language, person-centred wording, detail level, goal connection, participant/client response, follow-up clarity, risk clarity, and billing evidence strength.

Return scores, missing details, risky wording flags, and improvement suggestions.

## Check Missing Details

Check date/time, location, support delivered, staff action, participant/client response, outcome, goal link, risk/incident/refusal/injury/concern, follow-up, manager notification, duration, support type, and linked participant/client.

## Rewrite Risky Wording

Replace labels such as aggressive, difficult, manipulative, non-compliant, refused to listen, attention-seeking, bad behaviour, lazy, naughty, and meltdown with objective observable wording.

## Suggest Goal Links

Use participant profile goals, verified document goals, note content, and support type. Suggest only; do not force a goal.

## Incident Report Assistant

Summarise what happened, when/where, who was involved, injury/distress, immediate action, emergency support, notifications, follow-up, and preventive action. Include manager review prompt when risk is present.

## Guided Voice Interview

Ask one question at a time, capture responses, and convert the final transcript into a structured note. Keep transcript separate from final note.

## Invoice-readiness Check

Check approval/self-certification, support date, duration, support type, participant/client link, goal/service purpose, unresolved incident flags, and billing evidence score.

## Document Intelligence Extraction

Extract summary, goals, risks, support strategies, communication preferences, review dates, and confidence score. Mark all extracted information as unverified until a manager approves it.

## Audit Pack Summary

Summarise progress notes, goal progress, incidents, missing notes, risk wording, approval trail, staff involved, document evidence, verified document insights, and invoice-readiness evidence.
