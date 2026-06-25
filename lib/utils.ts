export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export const complianceDisclaimer =
  "Empower AI assists with documentation quality, wording, prompts, and evidence organisation. It does not replace professional judgement, clinical judgement, legal advice, safeguarding assessment, or NDIS compliance obligations.";

export const escalationWording =
  "This may require manager review for possible escalation or reportable incident assessment.";
