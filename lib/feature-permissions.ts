import type { UserRole } from "@/lib/sample-data";
import { normalizeAdminPermissions, type AdminPermission } from "@/lib/admin-permissions";

export const featurePermissionOptions = [
  "participants.view_basic", "participants.view_support", "participants.view_sensitive",
  "notes.create", "notes.view", "notes.review", "notes.approve",
  "incidents.create", "incidents.view", "incidents.review", "incidents.manage_followup",
  "meals.create", "meals.view", "handover.view", "handover.create",
  "rostering.view", "rostering.manage", "rostering.assign_staff",
  "staff.view", "staff.invite", "staff.manage", "staff.assign_houses", "documents.view", "documents.manage",
  "billing.view", "billing.manage", "billing.approve", "budgets.view", "budgets.manage",
  "house.dashboard.view", "organisation.dashboard.view",
  "service_agreements.view", "service_agreements.manage", "reports.view", "reports.export",
  "settings.view", "settings.manage", "organisation.settings.manage"
] as const;

export type FeaturePermission = typeof featurePermissionOptions[number];
export type EmploymentType = "casual" | "permanent" | "part_time" | "contractor" | "other";

const worker: FeaturePermission[] = ["participants.view_basic", "participants.view_support", "notes.create", "notes.view", "incidents.create", "meals.create", "meals.view", "handover.view", "handover.create", "rostering.view", "documents.view"];
const teamLead: FeaturePermission[] = [...worker, "notes.review", "incidents.view", "house.dashboard.view"];
const houseManager: FeaturePermission[] = [...teamLead, "participants.view_sensitive", "notes.approve", "incidents.review", "incidents.manage_followup", "rostering.manage", "rostering.assign_staff", "staff.view", "staff.assign_houses", "reports.view"];

export const rolePermissionTemplates: Record<UserRole, FeaturePermission[]> = {
  support_worker: worker,
  team_leader: teamLead,
  house_manager: houseManager,
  case_manager: [...teamLead, "participants.view_sensitive", "incidents.review", "reports.view"],
  service_manager: [...houseManager, "documents.manage", "reports.export"],
  operations_manager: [...houseManager, "staff.invite", "staff.manage", "organisation.dashboard.view", "reports.export"],
  finance_officer: ["participants.view_basic", "billing.view", "billing.manage", "service_agreements.view", "reports.view"],
  admin: [...featurePermissionOptions],
  owner: [...featurePermissionOptions],
  sole_provider: [...featurePermissionOptions]
};

export function normalizeFeaturePermissions(value: unknown): FeaturePermission[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<string>(featurePermissionOptions);
  return [...new Set(value.filter((item): item is FeaturePermission => typeof item === "string" && valid.has(item)))];
}

export function resolveFeaturePermissions(role: UserRole, overrides: unknown) {
  const normalized = normalizeFeaturePermissions(overrides);
  return normalized.length ? normalized : rolePermissionTemplates[role];
}

export const adminPermissionFeatureMap: Record<AdminPermission, FeaturePermission[]> = {
  incident_actioning: ["incidents.view", "incidents.review"],
  restrictive_practice_reporting: ["incidents.view", "incidents.review"],
  shift_verification: ["notes.view", "notes.review", "notes.approve"],
  scheduling: ["rostering.view", "rostering.manage", "rostering.assign_staff"],
  people: ["participants.view_basic", "participants.view_support", "participants.view_sensitive"],
  team: ["staff.view", "staff.invite", "staff.manage", "staff.assign_houses"],
  billing: ["billing.view", "billing.manage"],
  reports: ["reports.view", "reports.export"],
  documents: ["documents.view", "documents.manage"],
  settings: ["settings.view", "settings.manage", "organisation.settings.manage"]
};

export function resolveMembershipPermissions(role: UserRole, featureOverrides: unknown, adminPermissions: unknown) {
  if (["owner", "admin", "sole_provider"].includes(role)) return [...featurePermissionOptions];
  const resolved = resolveFeaturePermissions(role, featureOverrides);
  const legacy = normalizeAdminPermissions(adminPermissions).flatMap((permission) => adminPermissionFeatureMap[permission]);
  return [...new Set([...resolved, ...legacy])];
}
