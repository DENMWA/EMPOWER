import { resolveFeaturePermissions, type EmploymentType, type FeaturePermission } from "@/lib/feature-permissions";
import type { UserRole } from "@/lib/sample-data";

export type UserAccessContext = {
  userId: string;
  organisationId: string;
  role: UserRole;
  employmentType: EmploymentType;
  permissions: FeaturePermission[];
  activeHouseIds: string[];
  accessibleParticipantIds: string[];
  houseScoped: boolean;
  requestedHouseId: string;
};

export async function resolveUserAccessContext(request: Request, requested: { organisationId?: string; houseId?: string; participantId?: string } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!url || !anonKey || !serviceKey) return { context: null, status: 503, error: "Secure access resolution is not configured." };
  if (!authorization.startsWith("Bearer ")) return { context: null, status: 401, error: "Sign in to continue." };

  const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization }, cache: "no-store" });
  const authUser = authResponse.ok ? await authResponse.json() as { id?: string } : {};
  if (!authUser.id) return { context: null, status: 401, error: "Your session is no longer valid." };
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const legacyProfiles = await rows<{ organisation_id: string; role: UserRole; employment_type?: EmploymentType; feature_permissions?: FeaturePermission[]; access_status?: string }>(url, headers, `users?select=organisation_id,role,employment_type,feature_permissions,access_status&id=eq.${authUser.id}&limit=1`);
  const memberships = await rows<{ organisation_id: string; role: UserRole; employment_type?: EmploymentType; feature_permissions?: FeaturePermission[]; access_status?: string }>(url, headers, `organisation_memberships?select=organisation_id,role,employment_type,feature_permissions,access_status&user_id=eq.${authUser.id}`);
  const available = [...memberships, ...legacyProfiles.filter((profile) => !memberships.some((membership) => membership.organisation_id === profile.organisation_id))];
  const membership = requested.organisationId
    ? available.find((item) => item.organisation_id === requested.organisationId)
    : available[0];
  if (!membership || membership.access_status === "suspended") return { context: null, status: 403, error: "Active organisation membership is required." };

  const organisationId = membership.organisation_id;
  const fullOrganisationAccess = ["owner", "admin", "sole_provider"].includes(membership.role);
  const locations = await rows<{ id: string }>(url, headers, `service_locations?select=id&organisation_id=eq.${organisationId}&status=eq.active`);
  const activeHouseIds = fullOrganisationAccess
    ? locations.map((house) => house.id)
    : (await rows<{ house_id: string }>(url, headers,
      `staff_house_assignments?select=house_id&organisation_id=eq.${organisationId}&user_id=eq.${authUser.id}&status=in.(active,scheduled)&start_date=lte.${today()}&or=(end_date.is.null,end_date.gte.${today()})`))
      .map((assignment) => assignment.house_id);
  if (requested.houseId && !activeHouseIds.includes(requested.houseId)) return { context: null, status: 403, error: "This house is outside your active assignment." };

  const houseFilter = requested.houseId ? [requested.houseId] : activeHouseIds;
  const participantHouses = houseFilter.length ? await rows<{ participant_id: string }>(url, headers,
    `participant_house_assignments?select=participant_id&organisation_id=eq.${organisationId}&house_id=in.(${houseFilter.map(encodeURIComponent).join(",")})&status=in.(active,scheduled)&start_date=lte.${today()}&or=(end_date.is.null,end_date.gte.${today()})`) : [];
  const directAssignments = await rows<{ participant_id: string }>(url, headers, `participant_assignments?select=participant_id&organisation_id=eq.${organisationId}&user_id=eq.${authUser.id}`);
  const organisationParticipants = !locations.length || fullOrganisationAccess
    ? await rows<{ id: string }>(url, headers, `participants_or_clients?select=id&organisation_id=eq.${organisationId}&status=eq.active`)
    : [];
  const accessibleParticipantIds = [...new Set([
    ...participantHouses.map((item) => item.participant_id),
    ...directAssignments.map((item) => item.participant_id),
    ...organisationParticipants.map((item) => item.id)
  ])];
  if (requested.participantId && !accessibleParticipantIds.includes(requested.participantId)) return { context: null, status: 403, error: "This participant is outside your active scope." };

  const context: UserAccessContext = {
    userId: authUser.id,
    organisationId,
    role: membership.role,
    employmentType: membership.employment_type || "other",
    permissions: resolveFeaturePermissions(membership.role, membership.feature_permissions),
    activeHouseIds,
    accessibleParticipantIds,
    houseScoped: locations.length > 0,
    requestedHouseId: requested.houseId || ""
  };
  return { context, status: 200, error: "" };
}

export function requirePermission(context: UserAccessContext, permission: FeaturePermission) {
  return context.permissions.includes(permission);
}

async function rows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  return response.ok ? await response.json() as T[] : [];
}

function today() { return new Date().toISOString().slice(0, 10); }
