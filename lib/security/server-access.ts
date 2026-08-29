import { canAccessAdmin, type AdminPermission } from "@/lib/admin-permissions";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";
import type { FeaturePermission } from "@/lib/feature-permissions";

type AccessMode = "admin" | "platform";

const adminFeatureMap: Partial<Record<AdminPermission, FeaturePermission>> = {
  incident_actioning: "incidents.review",
  restrictive_practice_reporting: "incidents.review",
  shift_verification: "notes.review",
  scheduling: "rostering.manage",
  people: "participants.view_sensitive",
  team: "staff.view",
  billing: "billing.view",
  reports: "reports.view",
  settings: "organisation.settings.manage"
};

export type ServerAccessResult = {
  allowed: boolean;
  status: number;
  reason: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  organisationId: string;
  membershipId: string;
  permissions: string[];
  adminPermissions: AdminPermission[];
  correlationId: string;
  requiresMfa?: boolean;
};

export async function verifyServerAccess(request: Request, mode: AccessMode, requiredPermission?: AdminPermission, requiredFeature?: FeaturePermission): Promise<ServerAccessResult> {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return denied(resolved.status, resolved.error, resolved.correlationId);
  const context = resolved.context;

  if (mode === "admin" && !canAccessAdmin(context.role, context.adminPermissions, requiredPermission)) {
    logDenied(context.userId, request, context.correlationId);
    return denied(403, requiredPermission ? "This admin function has not been assigned to your account." : "Administrator access is required.", context.correlationId);
  }
  const feature = requiredFeature || (requiredPermission ? adminFeatureMap[requiredPermission] : undefined);
  if (feature && !context.permissions.includes(feature)) {
    logDenied(context.userId, request, context.correlationId);
    return denied(403, "This function has not been assigned to your organisation role.", context.correlationId);
  }

  if (mode === "platform") {
    const ownerEmails = new Set(
      (process.env.PLATFORM_OWNER_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    );
    if (context.role !== "owner" || !context.email || !ownerEmails.has(context.email.toLowerCase())) {
      return denied(403, "Platform owner access is required.", context.correlationId);
    }
  }

  return {
    allowed: true,
    status: 200,
    reason: "",
    userId: context.userId,
    email: context.email,
    name: context.name,
    role: context.role,
    organisationId: context.organisationId,
    membershipId: context.membershipId,
    permissions: context.permissions,
    adminPermissions: context.adminPermissions,
    correlationId: context.correlationId
  };
}

function denied(status: number, reason: string, correlationId = "", requiresMfa = false): ServerAccessResult {
  return { allowed: false, status, reason, userId: "", email: "", name: "", role: "", organisationId: "", membershipId: "", permissions: [], adminPermissions: [], correlationId, requiresMfa };
}

function logDenied(actorUserId: string, request: Request, correlationId: string) {
  console.warn(JSON.stringify({ event: "tenant_scope_denied", actorUserId, endpoint: new URL(request.url).pathname, correlationId, timestamp: new Date().toISOString() }));
}
