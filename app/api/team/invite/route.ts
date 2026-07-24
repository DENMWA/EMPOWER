import { NextRequest, NextResponse } from "next/server";

const managerRoles = new Set(["team_leader", "case_manager", "service_manager", "admin", "owner", "sole_provider"]);
const assignableRoles = new Set(["support_worker", "team_leader", "case_manager", "service_manager", "admin", "owner", "sole_provider"]);

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL || "EmpowerNotes <invites@empowernotes.org>";
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey) {
    return NextResponse.json({ ok: false, error: "Invitation email is not configured." }, { status: 503 });
  }

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Sign in before sending invitations." }, { status: 401 });
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!authResponse.ok) {
    return NextResponse.json({ ok: false, error: "Your session could not be verified." }, { status: 401 });
  }

  const authUser = await authResponse.json() as { id?: string };
  if (!authUser.id) {
    return NextResponse.json({ ok: false, error: "Your session could not be verified." }, { status: 401 });
  }

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=role,organisation_id&id=eq.${encodeURIComponent(authUser.id)}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });
  const profiles = profileResponse.ok
    ? await profileResponse.json() as Array<{ role?: string; organisation_id?: string }>
    : [];
  const profile = profiles[0];

  if (!profile?.role || !profile.organisation_id || !managerRoles.has(profile.role)) {
    return NextResponse.json({ ok: false, error: "Manager access is required to send staff invitations." }, { status: 403 });
  }

  const body = await request.json() as { name?: string; email?: string; role?: string; roleLabel?: string };
  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const role = body.role?.trim() || "support_worker";
  const roleLabel = body.roleLabel?.trim() || "Team member";

  if (!name || !email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Add a valid staff name and email." }, { status: 400 });
  }

  if (!assignableRoles.has(role)) {
    return NextResponse.json({ ok: false, error: "Select a valid staff role." }, { status: 400 });
  }

  if ((role === "owner" && profile.role !== "owner") || (role === "admin" && !["owner", "admin"].includes(profile.role))) {
    return NextResponse.json({ ok: false, error: "Only an owner or admin can grant this role." }, { status: 403 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const existingProfileResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    },
    cache: "no-store"
  });
  const existingProfiles = existingProfileResponse.ok ? await existingProfileResponse.json() as Array<{ id: string }> : [];
  if (existingProfiles.length) {
    return NextResponse.json({ ok: false, error: "This email already belongs to an EmpowerNotes user." }, { status: 409 });
  }

  const linkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "invite",
      email,
      options: {
        redirect_to: `${appUrl}/signin`,
        data: {
          name,
          role,
          organisation_id: profile.organisation_id
        }
      }
    })
  });

  if (!linkResponse.ok) {
    console.error("Supabase invite link failed", linkResponse.status, await linkResponse.text());
    return NextResponse.json({ ok: false, error: "The invite was saved, but a secure invitation link could not be created." }, { status: 502 });
  }

  const linkResult = await linkResponse.json() as { action_link?: string; user?: { id?: string } };
  if (!linkResult.action_link || !linkResult.user?.id) {
    return NextResponse.json({ ok: false, error: "The invite was saved, but a secure invitation link could not be created." }, { status: 502 });
  }

  const userProfileResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      id: linkResult.user.id,
      organisation_id: profile.organisation_id,
      name,
      email,
      role,
      provider_type: "organisation"
    })
  });

  if (!userProfileResponse.ok) {
    console.error("Invited user profile failed", userProfileResponse.status, await userProfileResponse.text());
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(linkResult.user.id)}`, {
      method: "DELETE",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`
      }
    });
    return NextResponse.json({ ok: false, error: "The secure invite was created, but organisation access could not be assigned." }, { status: 502 });
  }

  const invitationUrl = linkResult.action_link;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: sender,
      to: [email],
      subject: "You have been invited to EmpowerNotes",
      html: invitationEmailHtml({ name, roleLabel, invitationUrl })
    })
  });

  if (!resendResponse.ok) {
    const error = await resendResponse.text();
    console.error("Resend invitation failed", resendResponse.status, error);
    return NextResponse.json({ ok: false, error: "The invite was saved, but the email could not be delivered." }, { status: 502 });
  }

  const resendResult = await resendResponse.json() as { id?: string };
  return NextResponse.json({ ok: true, emailId: resendResult.id || null });
}

function invitationEmailHtml({ name, roleLabel, invitationUrl }: { name: string; roleLabel: string; invitationUrl: string }) {
  const safeName = escapeHtml(name);
  const safeRole = escapeHtml(roleLabel);
  const safeUrl = escapeHtml(invitationUrl);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f8fa;font-family:Arial,sans-serif;color:#17212b">
    <div style="max-width:560px;margin:0 auto;padding:36px 20px">
      <div style="background:#ffffff;border:1px solid #dfe5e9;padding:32px">
        <div style="font-size:20px;font-weight:700;color:#087f73">EmpowerNotes</div>
        <h1 style="margin:28px 0 12px;font-size:26px;line-height:1.25">You have been invited</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hello ${safeName},</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Your organisation has invited you to join EmpowerNotes as ${safeRole}.</p>
        <a href="${safeUrl}" style="display:inline-block;background:#087f73;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:4px">Accept invitation</a>
        <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#647181">If you were not expecting this invitation, you can ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[character] || character);
}
