export const trialRunStorageKey = "empowernotes-trial-run-completed";

export function getTrialRunCompletedSteps() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(trialRunStorageKey) || "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function saveTrialRunCompletedSteps(completed: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(trialRunStorageKey, JSON.stringify(completed));
}

export function markTrialStepComplete(stepId: string) {
  const completed = getTrialRunCompletedSteps();
  saveTrialRunCompletedSteps({ ...completed, [stepId]: true });
}
