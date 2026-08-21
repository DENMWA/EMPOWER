import { normalizeAdminPermissions, type AdminPermission } from "@/lib/admin-permissions";
import { resolveMembershipPermissions, type EmploymentType, type FeaturePermission } from "@/lib/feature-permissions";
import type { UserRole } from "@/lib/sample-data";

export type UserAccessContext = {
  userId: string;
  email: string;
  name: string;
  organisationId: string;
  membershipId: string;
  membershipStatus: "active";
  role: UserRole;
  employmentType: EmploymentType;
  permissions: FeaturePermission[];
  adminPermissions: AdminPermission[];
  activeHouseIds: string[];
  accessibleParticipantIds: string[];
  houseScoped: boolean;
  requestedHouseId: string;
  correlationId: string;
  aal: "aal1" | "aal2";
};

type RequestedScope = { organisationId?: string; houseId?: string; participantId?: string };
type MembershipRow = {
  id: string;
  organisation_id: string;
  role: UserRole;
  employment_type?: EmploymentType;
  feature_permissions?: FeaturePermission[];
  admin_permissions?: AdminPermission[];
  access_status?: string;
};
type AcceptedInviteRow = { organisation_id: string; email: string };
type OrganisationAccessRow = { platform_access_status?: string; platform_access_reason?: string | null };
type UserProfileRow = { organisation_id?: string; name?: string | null; email?: string | null };

export async function resolveUserAccessContext(request: Request, requested: RequestedScope = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();
  if (!url || !anonKey || !serviceKey) return denied(503, "Secure access resolution is not configured.", correlationId);
  if (!authorization.startsWith("Bearer ")) return denied(401, "Sign in to continue.", correlationId);

  try {
    const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization }, cache: "no-store" });
    const authUser = authResponse.ok ? await authResponse.json() as { id?: string; email?: string } : {};
    if (!authUser.id) return denied(401, "Your session is no longer valid.", correlationId);

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
    const [profiles, memberships, acceptedInvites] = await Promise.all([
      rows<UserProfileRow>(url, headers, `users?select=organisation_id,name,email&id=eq.${authUser.id}&limit=1`),
      rows<MembershipRow>(url, headers, `organisation_memberships?select=id,organisation_id,role,employment_type,feature_permissions,admin_permissions,access_status&user_id=eq.${authUser.id}`),
      rows<AcceptedInviteRow>(url, headers, `organisation_invites?select=organisation_id,email&auth_user_id=eq.${authUser.id}&status=eq.accepted`)
    ]);

    const pointer = profiles[0]?.organisation_id || "";
    const requestedOrganisationId = requested.organisationId || request.headers.get("x-empowernotes-organisation-id") || pointer;
    let membership: MembershipRow | undefined;
    if (requestedOrganisationId) {
      membership = memberships.find((item) => item.organisation_id === requestedOrganisationId);
    } else {
      const activeMemberships = memberships.filter((item) => item.access_status === "active");
      if (activeMemberships.length === 1) membership = activeMemberships[0];
      else if (activeMemberships.length > 1) return denied(409, "Select an organisation workspace to continue.", correlationId);
    }

    if (!membership || membership.access_status !== "active") {
      securityEvent("membership_denied", { actorUserId: authUser.id, endpoint: new URL(request.url).pathname, correlationId });
      return denied(403, "Active organisation membership is required.", correlationId);
    }
    const requestUrl = new URL(request.url);
    const isPlatformRecoveryRequest = requestUrl.pathname.startsWith("/api/platform/") || (requestUrl.pathname === "/api/auth/access" && requestUrl.searchParams.get("mode") === "platform");
    const organisations = await rows<OrganisationAccessRow>(url, headers, `organisations?select=platform_access_status,platform_access_reason&id=eq.${membership.organisation_id}&limit=1`);
    const platformStatus = organisations[0]?.platform_access_status || "active";
    if (!isPlatformRecoveryRequest && ["suspended", "locked_review", "cancelled"].includes(platformStatus)) {
      securityEvent("organisation_access_denied", { actorUserId: authUser.id, endpoint: new URL(request.url).pathname, correlationId });
      return denied(403, platformStatus === "cancelled" ? "This organisation account is no longer active." : "This organisation account is temporarily unavailable. Contact EmpowerNotes support.", correlationId);
    }
    const authenticatedEmail = authUser.email?.trim().toLowerCase() || "";
    const acceptedInvite = acceptedInvites.find((invite) => invite.organisation_id === membership.organisation_id);
    if (acceptedInvite && acceptedInvite.email.trim().toLowerCase() !== authenticatedEmail) {
      securityEvent("invited_email_mismatch", { actorUserId: authUser.id, endpoint: new URL(request.url).pathname, correlationId });
      return denied(403, "Sign in with the email address invited to this workspace.", correlationId);
    }

    const organisationId = membership.organisation_id;
    if (pointer && pointer !== organisationId) {
      securityEvent("stale_workspace_pointer", { actorUserId: authUser.id, endpoint: new URL(request.url).pathname, correlationId });
    }
    const fullOrganisationAccess = ["owner", "admin", "sole_provider"].includes(membership.role);
    const locations = await rows<{ id: string }>(url, headers, `service_locations?select=id&organisation_id=eq.${organisationId}&status=eq.active`);
    const assignedHouseIds = fullOrganisationAccess ? [] : (await rows<{ house_id: string }>(url, headers,
        `staff_house_assignments?select=house_id&organisation_id=eq.${organisationId}&user_id=eq.${authUser.id}&status=in.(active,scheduled)&start_date=lte.${today()}&or=(end_date.is.null,end_date.gte.${today()})`))
        .map((assignment) => assignment.house_id);
    const unrestrictedOrganisationAccess = fullOrganisationAccess || assignedHouseIds.length === 0;
    const activeHouseIds = unrestrictedOrganisationAccess ? locations.map((house) => house.id) : assignedHouseIds;
    if (requested.houseId && !activeHouseIds.includes(requested.houseId)) {
      securityEvent("house_scope_denied", { actorUserId: authUser.id, resourceId: requested.houseId, endpoint: new URL(request.url).pathname, correlationId });
      return denied(403, "This house is outside your active assignment.", correlationId);
    }

    const houseFilter = requested.houseId ? [requested.houseId] : activeHouseIds;
    const participantHouses = houseFilter.length ? await rows<{ participant_id: string }>(url, headers,
      `participant_house_assignments?select=participant_id&organisation_id=eq.${organisationId}&house_id=in.(${houseFilter.map(encodeURIComponent).join(",")})&status=in.(active,scheduled)&start_date=lte.${today()}&or=(end_date.is.null,end_date.gte.${today()})`) : [];
    const directAssignments = await rows<{ participant_id: string }>(url, headers, `participant_assignments?select=participant_id&organisation_id=eq.${organisationId}&user_id=eq.${authUser.id}`);
    const organisationParticipants = !locations.length || unrestrictedOrganisationAccess
      ? await rows<{ id: string }>(url, headers, `participants_or_clients?select=id&organisation_id=eq.${organisationId}&status=eq.active`)
      : [];
    const accessibleParticipantIds = [...new Set([
      ...participantHouses.map((item) => item.participant_id),
      ...directAssignments.map((item) => item.participant_id),
      ...organisationParticipants.map((item) => item.id)
    ])];
    if (requested.participantId && !accessibleParticipantIds.includes(requested.participantId)) {
      securityEvent("participant_scope_denied", { actorUserId: authUser.id, resourceId: requested.participantId, endpoint: new URL(request.url).pathname, correlationId });
      return denied(404, "The requested resource was not found.", correlationId);
    }

    const context: UserAccessContext = {
      userId: authUser.id,
      email: authUser.email || "",
      name: cleanDisplayName(profiles[0]?.name) || displayNameFromEmail(authUser.email || ""),
      organisationId,
      membershipId: membership.id,
      membershipStatus: "active",
      role: membership.role,
      employmentType: membership.employment_type || "other",
      permissions: resolveMembershipPermissions(membership.role, membership.feature_permissions, membership.admin_permissions),
      adminPermissions: normalizeAdminPermissions(membership.admin_permissions),
      activeHouseIds,
      accessibleParticipantIds,
      houseScoped: locations.length > 0,
      requestedHouseId: requested.houseId || "",
      correlationId,
      aal: readAssuranceLevel(authorization.slice(7))
    };
    return { context, status: 200, error: "", correlationId };
  } catch {
    return denied(503, "Secure access verification is temporarily unavailable.", correlationId);
  }
}

function readAssuranceLevel(token: string): "aal1" | "aal2" {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { aal?: string };
    return decoded.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

export function hasPermission(context: UserAccessContext, permission: FeaturePermission) {
  return context.permissions.includes(permission);
}

export const requirePermission = hasPermission;

async function rows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Access lookup failed (${response.status}).`);
  return await response.json() as T[];
}

function denied(status: number, error: string, correlationId: string) {
  return { context: null, status, error, correlationId };
}

function securityEvent(event: string, details: { actorUserId: string; endpoint: string; correlationId: string; resourceId?: string }) {
  console.warn(JSON.stringify({ event, ...details, timestamp: new Date().toISOString() }));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  void fetch(`${url}/rest/v1/platform_security_events`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ actor_user_id: details.actorUserId || null, event_type: event, severity: event.includes("denied") || event.includes("mismatch") ? "warning" : "info", summary: event.replaceAll("_", " "), endpoint: details.endpoint, correlation_id: details.correlationId, metadata: details.resourceId ? { resource_id: details.resourceId } : {} }),
    cache: "no-store"
  }).catch(() => undefined);
}

function today() { return new Date().toISOString().slice(0, 10); }

function cleanDisplayName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] || "Team member";
  return local.split(/[._-]+/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ") || "Team member";
}
