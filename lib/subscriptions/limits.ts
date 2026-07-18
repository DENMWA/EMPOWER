import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { getPlanToProgressEntitlements } from "@/lib/subscriptions/entitlements";

export function formatPlanLimit(value: number | null, unit = "") {
  if (value === null) return "Contract-based allowance";
  if (unit === "bytes") return formatBytes(value);
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
}

export function getUsageLimitRows(tier: SubscriptionTier) {
  const entitlements = getPlanToProgressEntitlements(tier);
  return [
    { label: "Active participants", value: entitlements.maxActiveParticipants },
    { label: "Users", value: entitlements.maxUsers },
    { label: "Documents per participant", value: entitlements.maxDocumentsPerParticipant },
    { label: "AI analysed notes/month", value: entitlements.maxAiAnalysedNotesPerMonth },
    { label: "Storage", value: entitlements.maxStorageBytes, unit: "bytes" },
    { label: "Approval stages", value: entitlements.maxApprovalStages }
  ];
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[unitIndex]}`;
}
