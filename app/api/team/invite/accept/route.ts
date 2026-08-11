import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!url || !anonKey || !serviceKey) return response("configuration", "Secure invitation acceptance is not configured.", 503);
  if (!authorization.startsWith("Bearer ")) return response("authentication", "Sign in with the invited email address to continue.", 401);

  const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization }, cache: "no-store" });
  const authUser = authResponse.ok ? await authResponse.json() as { id?: string; email?: string } : {};
  if (!authUser.id || !authUser.email) return response("authentication", "The invited account could not be verified.", 401);

  const body = await request.json() as { invitationId?: string };
  if (!body.invitationId) return response("validation", "The invitation identifier is missing.", 400);
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const inviteResponse = await fetch(`${url}/rest/v1/organisation_invites?select=*&id=eq.${encodeURIComponent(body.invitationId)}&limit=1`, { headers, cache: "no-store" });
  const invites = inviteResponse.ok ? await inviteResponse.json() as Array<{
    id: string; organisation_id: string; staff_invite_id?: string; email: string; name: string; role: string;
    admin_permissions?: string[]; status: string; expires_at: string; auth_user_id?: string;
  }> : [];
  const invite = invites[0];
  if (!invite) return response("not_found", "This invitation could not be found.", 404);
  if (invite.status === "revoked") return response("revoked", "This invitation has been revoked.", 410);
  if (invite.status === "accepted") return NextResponse.json({ ok: true, status: "accepted", organisationId: invite.organisation_id });
  if (invite.status !== "sent") return response("not_active", "This invitation is not ready for acceptance. Ask the administrator to resend it.", 409);
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    await patch(url, headers, `organisation_invites?id=eq.${invite.id}`, { status: "expired", updated_at: new Date().toISOString() });
    return response("expired", "This invitation has expired. Ask the administrator to resend it.", 410);
  }
  if (invite.email.trim().toLowerCase() !== authUser.email.trim().toLowerCase()) {
    return response("email_mismatch", "Sign in with the email address that received this invitation.", 403);
  }
  if (invite.auth_user_id && invite.auth_user_id !== authUser.id) return response("identity_mismatch", "This invitation belongs to another account.", 403);

  const membershipResponse = await fetch(`${url}/rest/v1/organisation_memberships?on_conflict=organisation_id,user_id`, {
    method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ organisation_id: invite.organisation_id, user_id: authUser.id, role: invite.role, admin_permissions: invite.admin_permissions || [], access_status: "active", updated_at: new Date().toISOString() })
  });
  if (!membershipResponse.ok) return response("membership", "Organisation access could not be activated.", 502);

  const profilesResponse = await fetch(`${url}/rest/v1/users?select=id&id=eq.${authUser.id}&limit=1`, { headers, cache: "no-store" });
  const profiles = profilesResponse.ok ? await profilesResponse.json() as Array<{ id: string }> : [];
  if (!profiles[0]) {
    const profileResponse = await fetch(`${url}/rest/v1/users`, {
      method: "POST", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ id: authUser.id, organisation_id: invite.organisation_id, name: invite.name, email: authUser.email.toLowerCase(), role: invite.role, provider_type: "organisation", admin_permissions: invite.admin_permissions || [] })
    });
    if (!profileResponse.ok) return response("profile", "The account was verified, but its workspace profile could not be completed.", 502);
  }

  if (invite.staff_invite_id) {
    await patch(url, headers, `staff_invites?id=eq.${invite.staff_invite_id}&organisation_id=eq.${invite.organisation_id}`, { invite_status: "Active" });
  }
  await patch(url, headers, `organisation_invites?id=eq.${invite.id}`, { status: "accepted", auth_user_id: authUser.id, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await fetch(`${url}/rest/v1/audit_logs`, {
    method: "POST", headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ organisation_id: invite.organisation_id, actor_id: authUser.id, action: "staff_invite_accepted", entity_type: "organisation_invite", entity_id: invite.id, metadata: { role: invite.role } })
  });
  return NextResponse.json({ ok: true, status: "accepted", organisationId: invite.organisation_id });
}

async function patch(url: string, headers: Record<string, string>, path: string, body: unknown) {
  return fetch(`${url}/rest/v1/${path}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(body), cache: "no-store" });
}

function response(category: string, error: string, status: number) {
  return NextResponse.json({ ok: false, category, error }, { status });
}
