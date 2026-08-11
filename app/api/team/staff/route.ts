import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import { normalizeAdminPermissions } from "@/lib/admin-permissions";
import { fullAdminRoles } from "@/lib/admin-permissions";
import { normalizeFeaturePermissions } from "@/lib/feature-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assignableRoles = new Set(["support_worker", "team_leader", "house_manager", "case_manager", "service_manager", "operations_manager", "finance_officer", "admin", "owner", "sole_provider"]);
const inviteStatuses = new Set(["Invite sent", "Draft", "Active", "Suspended"]);

export async function GET(request: Request) {
  const context = await getContext(request);
  if (context.response) return context.response;

  const response = await fetch(`${context.url}/rest/v1/staff_invites?select=id,name,email,role,invite_status,assigned_participant_ids,house_access_mode,assigned_house_ids,admin_permissions,employment_type,feature_permissions,permission_template_key,assignment_start_date,assignment_end_date,created_at&organisation_id=eq.${encodeURIComponent(context.organisationId)}&order=created_at.desc`, {
    headers: context.headers,
    cache: "no-store"
  });
  if (!response.ok) return databaseError(response, "Staff records could not be loaded.");
  const staff = await response.json() as Array<Record<string, unknown> & { email?: string }>;
  const usersResponse = await fetch(`${context.url}/rest/v1/users?select=id,email&organisation_id=eq.${encodeURIComponent(context.organisationId)}`, {
    headers: context.headers,
    cache: "no-store"
  });
  const users = usersResponse.ok ? await usersResponse.json() as Array<{ id: string; email: string }> : [];
  const userIdByEmail = new Map(users.map((user) => [user.email.trim().toLowerCase(), user.id]));
  const linkedStaff = staff.map((member) => ({
    ...member,
    auth_user_id: member.email ? userIdByEmail.get(member.email.trim().toLowerCase()) || null : null
  }));
  return NextResponse.json(linkedStaff, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = await getContext(request);
  if (context.response) return context.response;

  const body = await request.json() as StaffInput;
  const validationError = validateStaff(body, context.role);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const response = await fetch(`${context.url}/rest/v1/staff_invites?on_conflict=id`, {
    method: "POST",
    headers: { ...context.headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: body.id,
      organisation_id: context.organisationId,
      name: body.name?.trim(),
      email: body.email?.trim().toLowerCase(),
      role: body.role,
      invite_status: body.inviteStatus,
      assigned_participant_ids: body.assignedParticipantIds || [],
      house_access_mode: body.houseAccessMode === "all" ? "all" : "selected",
      assigned_house_ids: body.assignedHouseIds || [],
      admin_permissions: normalizeAdminPermissions(body.adminPermissions),
      employment_type: body.employmentType || "other",
      feature_permissions: normalizeFeaturePermissions(body.featurePermissions),
      permission_template_key: body.permissionTemplateKey || `${body.role}_default`,
      assignment_start_date: body.assignmentStartDate || null,
      assignment_end_date: body.assignmentEndDate || null
    })
  });
  if (!response.ok) return databaseError(response, "Staff permissions could not be saved.");
  return NextResponse.json(await response.json());
}

export async function PATCH(request: Request) {
  const context = await getContext(request);
  if (context.response) return context.response;
  const body = await request.json() as { id?: string; inviteStatus?: string };
  if (!body.id || !body.inviteStatus || !inviteStatuses.has(body.inviteStatus)) {
    return NextResponse.json({ error: "Select a valid staff record and invitation status." }, { status: 400 });
  }
  if (!fullAdminRoles.has(context.role)) {
    return NextResponse.json({ error: "Only an owner or full administrator can suspend or reactivate staff." }, { status: 403 });
  }

  const targetResponse = await fetch(`${context.url}/rest/v1/staff_invites?select=id,email,role&id=eq.${encodeURIComponent(body.id)}&organisation_id=eq.${encodeURIComponent(context.organisationId)}&limit=1`, {
    headers: context.headers,
    cache: "no-store"
  });
  const targets = targetResponse.ok ? await targetResponse.json() as Array<{ id: string; email: string; role: string }> : [];
  const target = targets[0];
  if (!target) return NextResponse.json({ error: "The staff record could not be found." }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "The organisation owner cannot be suspended here." }, { status: 403 });

  const response = await fetch(`${context.url}/rest/v1/staff_invites?id=eq.${encodeURIComponent(body.id)}&organisation_id=eq.${encodeURIComponent(context.organisationId)}`, {
    method: "PATCH",
    headers: { ...context.headers, Prefer: "return=representation" },
    body: JSON.stringify({ invite_status: body.inviteStatus })
  });
  if (!response.ok) return databaseError(response, "Staff status could not be updated.");
  const publicUserResponse = await fetch(`${context.url}/rest/v1/users?select=id,email&id=eq.${encodeURIComponent(target.email)}&organisation_id=eq.${encodeURIComponent(context.organisationId)}&limit=1`, {
    headers: context.headers,
    cache: "no-store"
  });
  const publicUsers = publicUserResponse.ok ? await publicUserResponse.json() as Array<{ id: string; email: string }> : [];
  const publicUser = publicUsers[0];
  if (publicUser) {
    const accessStatus = body.inviteStatus === "Suspended" ? "suspended" : "active";
    const userUpdate = await fetch(`${context.url}/rest/v1/users?id=eq.${encodeURIComponent(publicUser.id)}&organisation_id=eq.${encodeURIComponent(context.organisationId)}`, {
      method: "PATCH",
      headers: { ...context.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ access_status: accessStatus })
    });
    if (!userUpdate.ok) return databaseError(userUpdate, "Staff access status could not be updated.");

    const authUpdate = await fetch(`${context.url}/auth/v1/admin/users/${encodeURIComponent(publicUser.id)}`, {
      method: "PUT",
      headers: context.headers,
      body: JSON.stringify({ ban_duration: body.inviteStatus === "Suspended" ? "876000h" : "none" })
    });
    if (!authUpdate.ok) return databaseError(authUpdate, "Staff authentication access could not be updated.");
  }
  return NextResponse.json(await response.json());
}

type StaffInput = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  inviteStatus?: string;
  assignedParticipantIds?: string[];
  houseAccessMode?: string;
  assignedHouseIds?: string[];
  adminPermissions?: unknown;
  employmentType?: string;
  featurePermissions?: unknown;
  permissionTemplateKey?: string;
  assignmentStartDate?: string | null;
  assignmentEndDate?: string | null;
};

function validateStaff(body: StaffInput, currentRole: string) {
  if (!body.id || !body.name?.trim() || !body.email?.includes("@")) return "Add a valid staff name and email.";
  if (!body.role || !assignableRoles.has(body.role)) return "Select a valid staff role.";
  if (!body.inviteStatus || !inviteStatuses.has(body.inviteStatus)) return "Select a valid invitation status.";
  if (body.role === "owner" && currentRole !== "owner") return "Only the organisation owner can grant owner access.";
  if (body.role === "admin" && !["owner", "admin"].includes(currentRole)) return "Only an owner or admin can grant administrator access.";
  if (normalizeAdminPermissions(body.adminPermissions).length && !["owner", "admin", "sole_provider"].includes(currentRole)) {
    return "Only an owner or administrator can assign manager functions.";
  }
  return "";
}

async function getContext(request: Request) {
  const access = await verifyServerAccess(request, "admin", "team", "staff.manage");
  if (!access.allowed) return { response: NextResponse.json({ error: access.reason }, { status: access.status }), url: "", organisationId: "", role: "", headers: {} };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { response: NextResponse.json({ error: "Secure staff storage is not configured." }, { status: 503 }), url: "", organisationId: "", role: "", headers: {} };
  return {
    response: null,
    url,
    organisationId: access.organisationId,
    role: access.role,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }
  };
}

async function databaseError(response: Response, fallback: string) {
  const detail = await response.text();
  console.error(fallback, response.status, detail);
  return NextResponse.json({ error: fallback }, { status: 502 });
}
