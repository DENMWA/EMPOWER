export const adminPermissionOptions = [
  { key: "incident_actioning", label: "Incident actioning", description: "Review incidents and record manager actions." },
  { key: "shift_verification", label: "Shift verification", description: "Review, approve, and return shift records." },
  { key: "scheduling", label: "Scheduling", description: "Create and manage rosters and staff assignments." },
  { key: "people", label: "Clients and houses", description: "Manage client profiles, houses, and service assignments." },
  { key: "team", label: "Staff access", description: "Invite staff and manage their access." },
  { key: "billing", label: "Invoicing", description: "Manage agreements, evidence and invoices." },
  { key: "reports", label: "Reports", description: "View reports, progress intelligence, and audit packs." },
  { key: "settings", label: "Settings", description: "Manage organisation profile and protected settings." }
] as const;

export type AdminPermission = typeof adminPermissionOptions[number]["key"];

export const fullAdminRoles = new Set(["owner", "admin", "sole_provider"]);
export const delegatedManagerRoles = new Set(["team_leader", "case_manager", "service_manager"]);
const validPermissions = new Set<string>(adminPermissionOptions.map((option) => option.key));

export function isAdminPermission(value: string): value is AdminPermission {
  return validPermissions.has(value);
}

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is AdminPermission => typeof item === "string" && isAdminPermission(item)))];
}

export function canAccessAdmin(role: string, permissions: readonly AdminPermission[], required?: AdminPermission) {
  if (fullAdminRoles.has(role)) return true;
  if (!delegatedManagerRoles.has(role)) return false;
  return required ? permissions.includes(required) : permissions.length > 0;
}
