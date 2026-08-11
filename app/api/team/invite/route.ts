import { NextRequest, NextResponse } from "next/server";
import { getPlanCatalogueEntry } from "@/lib/subscriptions/catalog";
import { resolveServerSubscriptionContext } from "@/lib/subscriptions/server-context";
import { adminPermissionOptions, normalizeAdminPermissions } from "@/lib/admin-permissions";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assignableRoles = new Set(["support_worker", "team_leader", "case_manager", "service_manager", "admin"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteInput = {
  staffId?: string;
  name?: string;
  email?: string;
  role?: string;
  roleLabel?: string;
  adminPermissions?: unknown;
  assignedParticipantIds?: string[];
  houseAccessMode?: string;
  assignedHouseIds?: string[];
  resend?: boolean;
};

export async function POST(request: NextRequest) {
  const access = await verifyServerAccess(request, "admin", "team");
  if (!access.allowed) return NextResponse.json({ ok: false, error: access.reason }, { status: access.status });

  const subscription = await resolveServerSubscriptionContext(request);
  if (!subscription.authenticated || subscription.source !== "supabase") {
    return NextResponse.json({ ok: false, error: subscription.resolutionError || "Sign in before sending invitations." }, { status: 401 });
  }
  if (!getPlanCatalogueEntry(subscription.tier).operations.teamManagement) {
    return NextResponse.json({ ok: false, error: "Team management requires the Practice plan or above." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL || "EmpowerNotes <invites@empowernotes.org>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  if (!url || !serviceKey) return invitationError("server_configuration", "Secure invitation services are not configured.", 503);
  if (!resendKey) return invitationError("email_configuration", "Email delivery is not configured for external invitations.", 503);
  if (!/^https:\/\//.test(appUrl) && process.env.NODE_ENV === "production") {
    return invitationError("redirect_configuration", "The production invitation address is not configured.", 503);
  }

  const body = await request.json() as InviteInput;
  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const role = body.role?.trim() || "support_worker";
  const roleLabel = body.roleLabel?.trim() || "Team member";
  const permissions = normalizeAdminPermissions(body.adminPermissions);
  if (!body.staffId || !name || !emailPattern.test(email)) return invitationError("validation", "Add a valid staff name and email.", 400);
  if (!assignableRoles.has(role)) return invitationError("validation", "Select a valid organisation role.", 400);
  if (role === "admin" && !["owner", "admin", "sole_provider"].includes(access.role)) {
    return invitationError("role_escalation", "Only an owner or administrator can grant administrator access.", 403);
  }
  if (permissions.length && !["owner", "admin", "sole_provider"].includes(access.role)) {
    return invitationError("role_escalation", "Only an owner or administrator can assign manager functions.", 403);
  }

  const headers = serviceHeaders(serviceKey);
  const draftStaff = await postRows<{ id: string }>(url, headers, "staff_invites?on_conflict=id", {
    id: body.staffId,
    organisation_id: access.organisationId,
    name,
    email,
    role,
    invite_status: "Draft",
    assigned_participant_ids: body.assignedParticipantIds || [],
    house_access_mode: body.houseAccessMode === "all" ? "all" : "selected",
    assigned_house_ids: body.assignedHouseIds || [],
    admin_permissions: permissions,
    created_by: access.userId
  }, "resolution=merge-duplicates,return=representation");
  if (!draftStaff[0]?.id) return invitationError("database", "The pending staff invitation could not be saved.", 502);

  const users = await findAuthUsers(url, headers, email);
  const authUser = users.find((user) => user.email?.trim().toLowerCase() === email);
  if (authUser?.id) {
    const membership = await getRows<{ id: string }>(url, headers, `organisation_memberships?select=id&organisation_id=eq.${access.organisationId}&user_id=eq.${authUser.id}&limit=1`);
    const legacyMembership = await getRows<{ id: string }>(url, headers, `users?select=id&organisation_id=eq.${access.organisationId}&id=eq.${authUser.id}&limit=1`);
    if (membership[0] || legacyMembership[0]) return invitationError("existing_member", "This user already belongs to this organisation.", 409);
  }

  const openInvites = await getRows<{ id: string; status: string; expires_at: string }>(url, headers,
    `organisation_invites?select=id,status,expires_at&organisation_id=eq.${access.organisationId}&email=eq.${encodeURIComponent(email)}&status=in.(pending,sent)&order=created_at.desc&limit=1`);
  const existingInvite = openInvites[0];
  if (existingInvite?.status === "sent" && !body.resend) {
    return invitationError("pending_invite", "Invitation already pending. Use resend if the recipient needs a new email.", 409);
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const invitePayload = {
    organisation_id: access.organisationId,
    staff_invite_id: body.staffId,
    email,
    name,
    role,
    admin_permissions: permissions,
    assigned_participant_ids: body.assignedParticipantIds || [],
    house_access_mode: body.houseAccessMode === "all" ? "all" : "selected",
    assigned_house_ids: body.assignedHouseIds || [],
    invited_by: access.userId,
    auth_user_id: authUser?.id || null,
    status: "pending",
    expires_at: expiresAt,
    error_category: null,
    updated_at: new Date().toISOString()
  };
  const invitation = existingInvite
    ? await patchRows<{ id: string }>(url, headers, `organisation_invites?id=eq.${existingInvite.id}&organisation_id=eq.${access.organisationId}`, invitePayload)
    : await postRows<{ id: string }>(url, headers, "organisation_invites", invitePayload);
  if (!invitation[0]?.id) return invitationError("database", "The invitation could not be prepared. Apply the organisation invitation database migration and retry.", 502);
  const invitationId = invitation[0].id;
  await audit(url, headers, access, invitationId, "staff_invite_created", { email, role });

  let authUserId = authUser?.id || "";
  let invitationUrl = `${appUrl}/signin?next=${encodeURIComponent(`/auth/accept-invite?id=${invitationId}`)}`;
  let generatedNewAuthUser = false;
  if (!authUserId) {
    const redirectTo = `${appUrl}/auth/accept-invite?id=${invitationId}`;
    const linkResponse = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "invite", email, redirect_to: redirectTo, data: { name, invitation_id: invitationId } }),
      cache: "no-store"
    });
    const linkBody = await readJson<{ action_link?: string; user?: { id?: string }; msg?: string; message?: string }>(linkResponse);
    if (!linkResponse.ok || !linkBody.action_link || !linkBody.user?.id) {
      const category = linkResponse.status === 429 ? "rate_limit" : /authoriz|smtp|email/i.test(linkBody.msg || linkBody.message || "") ? "email_configuration" : "auth_api";
      await markFailed(url, headers, invitationId, category);
      await audit(url, headers, access, invitationId, "staff_invite_failed", { email, role, category });
      const message = category === "rate_limit"
        ? "Invitation sending is temporarily rate limited. Please try again later."
        : category === "email_configuration"
          ? "Email delivery is not configured for external invitations. Please check production email settings."
          : "A secure invitation link could not be generated. Please retry or check Supabase Auth logs.";
      return invitationError(category, message, linkResponse.status === 429 ? 429 : 502);
    }
    authUserId = linkBody.user.id;
    invitationUrl = linkBody.action_link;
    generatedNewAuthUser = true;
  }

  const organisation = await getRows<{ name: string }>(url, headers, `organisations?select=name&id=eq.${access.organisationId}&limit=1`);
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender,
      to: [email],
      subject: "You have been invited to EmpowerNotes",
      html: invitationEmailHtml({ organisationName: organisation[0]?.name || "Your organisation", roleLabel, invitationUrl, expiresAt })
    })
  });
  const emailResult = await readJson<{ id?: string; message?: string }>(emailResponse);
  if (!emailResponse.ok || !emailResult.id) {
    const category = emailResponse.status === 429 ? "rate_limit" : /domain|sender|verify/i.test(emailResult.message || "") ? "email_configuration" : "email_delivery";
    await markFailed(url, headers, invitationId, category);
    await audit(url, headers, access, invitationId, "staff_invite_failed", { email, role, category });
    if (generatedNewAuthUser) await deleteAuthUser(url, headers, authUserId);
    return invitationError(category, category === "email_configuration"
      ? "Invitation could not be sent. Check the verified Resend sender domain and RESEND_FROM_EMAIL."
      : "Invitation could not be delivered. Please check email delivery logs or try again.", emailResponse.status === 429 ? 429 : 502);
  }

  const staffRows = await postRows<{ id: string }>(url, headers, "staff_invites?on_conflict=id", {
    id: body.staffId,
    organisation_id: access.organisationId,
    name,
    email,
    role,
    invite_status: "Invite sent",
    assigned_participant_ids: body.assignedParticipantIds || [],
    house_access_mode: body.houseAccessMode === "all" ? "all" : "selected",
    assigned_house_ids: body.assignedHouseIds || [],
    admin_permissions: permissions,
    created_by: access.userId
  }, "resolution=merge-duplicates,return=representation");
  if (!staffRows[0]?.id) {
    await markFailed(url, headers, invitationId, "database");
    return invitationError("database", "The email was sent, but the pending staff record could not be saved. Contact support before resending.", 502);
  }
  await patchRows(url, headers, `organisation_invites?id=eq.${invitationId}`, {
    status: "sent", auth_user_id: authUserId, delivery_provider: "resend", delivery_reference: emailResult.id, updated_at: new Date().toISOString()
  });
  await audit(url, headers, access, invitationId, body.resend ? "staff_invite_resent" : "staff_invite_sent", { email, role });
  return NextResponse.json({ ok: true, status: "sent", invitationId });
}

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function findAuthUsers(url: string, headers: Record<string, string>, email: string) {
  const response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers, cache: "no-store" });
  const body = await readJson<{ users?: Array<{ id: string; email?: string }> }>(response);
  return body.users?.filter((user) => user.email?.trim().toLowerCase() === email) || [];
}

async function getRows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  return response.ok ? await response.json() as T[] : [];
}

async function postRows<T>(url: string, headers: Record<string, string>, path: string, body: unknown, prefer = "return=representation"): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers: { ...headers, Prefer: prefer }, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok || response.status === 204 || prefer === "return=minimal") return [];
  return await response.json() as T[];
}

async function patchRows<T = Record<string, unknown>>(url: string, headers: Record<string, string>, path: string, body: unknown): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(body), cache: "no-store" });
  return response.ok ? await response.json() as T[] : [];
}

async function markFailed(url: string, headers: Record<string, string>, id: string, category: string) {
  await patchRows(url, headers, `organisation_invites?id=eq.${id}`, { status: "failed", error_category: category, updated_at: new Date().toISOString() });
}

async function audit(url: string, headers: Record<string, string>, access: { organisationId: string; userId: string }, id: string, action: string, metadata: unknown) {
  await postRows(url, headers, "audit_logs", { organisation_id: access.organisationId, actor_id: access.userId, action, entity_type: "organisation_invite", entity_id: id, metadata }, "return=minimal");
}

async function deleteAuthUser(url: string, headers: Record<string, string>, id: string) {
  await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE", headers, cache: "no-store" });
}

async function readJson<T>(response: Response): Promise<T> {
  try { return await response.json() as T; } catch { return {} as T; }
}

function invitationError(category: string, error: string, status: number) {
  return NextResponse.json({ ok: false, category, error }, { status });
}

function invitationEmailHtml({ organisationName, roleLabel, invitationUrl, expiresAt }: { organisationName: string; roleLabel: string; invitationUrl: string; expiresAt: string }) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f6f8fa;font-family:Arial,sans-serif;color:#17212b"><div style="max-width:560px;margin:0 auto;padding:36px 20px"><div style="background:#fff;border:1px solid #dfe5e9;padding:32px"><div style="font-size:20px;font-weight:700;color:#087f73">EmpowerNotes</div><h1 style="margin:28px 0 12px;font-size:26px">You've been invited to EmpowerNotes</h1><p style="font-size:16px;line-height:1.6">${escapeHtml(organisationName)} has invited you to join their workspace as ${escapeHtml(roleLabel)}.</p><a href="${escapeHtml(invitationUrl)}" style="display:inline-block;margin-top:12px;background:#087f73;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:4px">Accept EmpowerNotes invitation</a><p style="margin-top:26px;font-size:13px;line-height:1.6;color:#647181">This invitation expires ${escapeHtml(new Date(expiresAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }))}. If you weren't expecting it, you can ignore this email.</p><p style="font-size:13px;color:#647181">Powered by EmpowerNotes</p></div></div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] || character);
}
