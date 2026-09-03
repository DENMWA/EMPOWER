import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("privileged server access delegates to active organisation membership authority", async () => {
  const [access, resolver] = await Promise.all([source("lib/security/server-access.ts"), source("lib/security/user-access-context.ts")]);
  assert.match(access, /resolveUserAccessContext\(request\)/);
  assert.match(access, /canAccessAdmin\(context\.role, context\.adminPermissions, requiredPermission\)/);
  assert.match(access, /name: context\.name/);
  assert.doesNotMatch(access, /users\?select=role,organisation_id/);
  assert.match(resolver, /users\?select=organisation_id,name,email/);
  assert.match(resolver, /name: cleanDisplayName\(profiles\[0\]\?\.name\) \|\| displayNameFromEmail/);
  assert.match(resolver, /organisation_memberships\?select=id,organisation_id,role/);
  assert.match(resolver, /membership\.access_status !== "active"/);
  assert.doesNotMatch(resolver, /legacyProfiles|available\[0\]/);
  assert.match(access, /PLATFORM_OWNER_EMAILS/);
});

test("sensitive tenant caches are written only after cloud success", async () => {
  const [clients, documents, retained] = await Promise.all([
    source("lib/client-records.ts"),
    source("lib/document-records.ts"),
    source("lib/retained-records.ts")
  ]);
  assert.ok(clients.indexOf("addStoredClient(toClientRecord(savedClient))") > clients.indexOf("await supabaseRequest"));
  assert.ok(documents.indexOf("if (savedToCloud) addStoredDocumentRecord(record)") > documents.indexOf("await supabaseRequest"));
  assert.ok(retained.indexOf("if (savedToCloud) saveLocalRetainedRecord(record)") > retained.indexOf("await supabaseRequest"));
});

test("global response hardening remains configured", async () => {
  const config = await source("next.config.mjs");
  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Permissions-Policy"]) {
    assert.match(config, new RegExp(header));
  }
});

test("password reset uses a direct reset page and hides raw authenticator errors", async () => {
  const auth = await source("lib/supabase-auth.ts");
  assert.match(auth, /const redirectTo = appUrl \? `\$\{appUrl\}\/reset-password` : ""/);
  assert.match(auth, /humaniseAuthError/);
  assert.match(auth, /This account still has an authenticator requirement attached/);
  assert.doesNotMatch(auth, /return parsed\.msg \|\| parsed\.message \|\| parsed\.error_description \|\| error/);
});

test("signup security-delay responses hand off to the workspace flow", async () => {
  const [auth, signup] = await Promise.all([
    source("lib/supabase-auth.ts"),
    source("components/onboarding/SimpleSignupForm.tsx")
  ]);
  assert.match(auth, /const redirectTo = appUrl \? `\$\{appUrl\}\/signin` : ""/);
  assert.match(signup, /signInWithPassword\(cleanEmail, password\)/);
  assert.match(signup, /isSignupDelayMessage/);
  assert.match(signup, /Welcome to your workspace\./);
  assert.doesNotMatch(signup, /For security purposes/);
});

test("stored Supabase sessions refresh instead of dropping workspace access", async () => {
  const [auth, shell] = await Promise.all([
    source("lib/supabase-auth.ts"),
    source("components/AppShell.tsx")
  ]);
  assert.match(auth, /refreshSupabaseSession/);
  assert.match(auth, /options: \{ force\?: boolean \} = \{\}/);
  assert.match(auth, /!options\.force/);
  assert.match(auth, /grant_type=refresh_token/);
  assert.match(auth, /refresh_token: session\.refresh_token/);
  assert.doesNotMatch(auth, /decoded\.exp && decoded\.exp \* 1000 <= Date\.now\(\)\)\s*\{\s*signOutSupabaseSession/);
  assert.match(shell, /await refreshSupabaseSession\(\)/);
  assert.match(shell, /setDataMode\(authStatus\.signedIn \? "real" : "demo"\)/);
});

test("the public Vercel hostname redirects to the EmpowerNotes domain", async () => {
  const nextConfig = await source("next.config.mjs");
  const layout = await source("app/layout.tsx");

  assert.match(nextConfig, /empower-opal\.vercel\.app/);
  assert.match(nextConfig, /https:\/\/www\.empowernotes\.org\/\:path\*/);
  assert.match(nextConfig, /permanent:\s*true/);
  assert.match(layout, /https:\/\/www\.empowernotes\.org/);
});

test("admin navigation relies on verified server access", async () => {
  const [shell, gate] = await Promise.all([
    source("components/AppShell.tsx"),
    source("components/admin/AdminGate.tsx")
  ]);

  assert.match(shell, /item\.href !== "\/admin" \|\| verifiedAdmin/);
  assert.match(shell, /\/api\/access\/context/);
  assert.match(shell, /aria-label=\{`Signed in as \$\{displayName\}`\}/);
  assert.doesNotMatch(shell, /canAccessAdmin\(currentUser\.role\)/);
  assert.match(shell, /pathname\.startsWith\("\/admin"\).*verifiedAdmin/);
  assert.match(gate, /router\.replace\("\/dashboard"\)/);
  assert.match(gate, /\/api\/auth\/access\?mode=admin/);
});

test("organisation administrators use password and role-based access", async () => {
  const [shell, gate, accessRoute, serverAccess] = await Promise.all([
    source("components/AppShell.tsx"),
    source("components/admin/AdminGate.tsx"),
    source("app/api/auth/access/route.ts"),
    source("lib/security/server-access.ts")
  ]);
  assert.match(shell, /admin\.allowed/);
  assert.match(accessRoute, /name: access\.name/);
  assert.doesNotMatch(gate, /\/mfa\?next=/);
  assert.match(accessRoute, /requiresMfa: access\.requiresMfa/);
  assert.match(serverAccess, /PLATFORM_OWNER_EMAILS/);
  assert.doesNotMatch(serverAccess, /mode === "platform" && context\.aal !== "aal2"/);
});

test("platform analytics endpoint requires platform-owner verification", async () => {
  const [route, dashboard] = await Promise.all([
    source("app/api/platform/summary/route.ts"),
    source("components/platform/PlatformDashboard.tsx")
  ]);
  assert.match(route, /verifyServerAccess\(request, "platform"\)/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /created_at/);
  assert.match(dashboard, /New providers/);
  assert.match(dashboard, /Registered in the last 30 days/);
  assert.match(dashboard, /New provider/);
  assert.match(dashboard, /registrationAgeLabel/);
});

test("platform operations are server enforced, audited, and isolated from tenant clients", async () => {
  const [route, migration, access, dashboard, support] = await Promise.all([
    source("app/api/platform/operations/route.ts"),
    source("supabase/platform-operations-console.sql"),
    source("lib/security/user-access-context.ts"),
    source("components/platform/PlatformDashboard.tsx"),
    source("app/api/support/issues/route.ts")
  ]);
  assert.match(route, /verifyServerAccess\(request, "platform"\)/);
  assert.match(route, /platform_access_status/);
  assert.match(route, /platform_security_events/);
  assert.match(migration, /platform_access_status in \('active', 'payment_risk', 'suspended', 'locked_review', 'cancelled'\)/);
  assert.match(migration, /revoke all on public\.platform_security_events from anon, authenticated/);
  assert.match(migration, /revoke all on public\.platform_support_cases from anon, authenticated/);
  assert.match(access, /organisation_access_denied/);
  assert.match(access, /platformStatus/);
  assert.match(dashboard, /Organisation access updated and audited/);
  assert.doesNotMatch(dashboard.slice(0, dashboard.indexOf("function PlatformAreaContent")), /setPlatformAccessStatus\(/);
  assert.match(support, /resolveUserAccessContext\(request\)/);
  assert.match(support, /organisation_id: resolved\.context\.organisationId/);
});

test("the live developer console preserves every established operational workspace", async () => {
  const [dashboard, shell] = await Promise.all([
    source("components/platform/PlatformDashboard.tsx"),
    source("components/AppShell.tsx")
  ]);
  for (const area of ["overview", "organisations", "subscriptions", "payments", "ndis", "diagnostics", "analytics", "marketing", "security", "support", "trial"]) {
    assert.match(dashboard, new RegExp(`"${area}"`));
  }
  assert.match(dashboard, /activeArea === "ndis"[\s\S]*<NdisPricingMonitorPanel/);
  assert.match(dashboard, /activeArea === "marketing"[\s\S]*<MarketingAttributionPanel/);
  assert.match(dashboard, /return <TrialRunChecklist \/>/);
  assert.match(shell, /\["NDIS Pricing", "ndis"\]/);
  assert.match(shell, /\["Trial Run", "trial"\]/);
});

test("platform visual intelligence uses live ledgers and daily non-clinical snapshots", async () => {
  const [charts, dashboard, operations, cron, migration, vercel] = await Promise.all([
    source("components/platform/PlatformVisualIntelligence.tsx"),
    source("components/platform/PlatformDashboard.tsx"),
    source("app/api/platform/operations/route.ts"),
    source("app/api/cron/platform-metrics/route.ts"),
    source("supabase/platform-metric-snapshots.sql"),
    source("vercel.json")
  ]);
  assert.match(charts, /Platform growth/);
  assert.match(charts, /Revenue collected/);
  assert.match(charts, /Payment ageing/);
  assert.match(charts, /Organisation scale/);
  assert.match(charts, /Selected detail/);
  assert.match(dashboard, /setInterval\(\(\) => void loadData\(\), 120000\)/);
  assert.match(operations, /platform_metric_snapshots/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /platform_metric_snapshots\?on_conflict=snapshot_date,organisation_id/);
  assert.match(migration, /Contains no participant names, notes, diagnoses or document content/);
  assert.match(migration, /revoke all on public\.platform_metric_snapshots from anon, authenticated/);
  assert.match(vercel, /api\/cron\/platform-metrics/);
});

test("system health monitoring is owner-only and read-only", async () => {
  const route = await source("app/api/platform/health/route.ts");
  assert.match(route, /verifyServerAccess\(request, "platform"\)/);
  assert.doesNotMatch(route, /method:\s*"(POST|PATCH|PUT|DELETE)"/);
  assert.doesNotMatch(route, /chat\/completions|responses/);
});

test("background health monitoring requires a cron secret and isolates incident history", async () => {
  const [cron, policy] = await Promise.all([
    source("app/api/cron/platform-health/route.ts"),
    source("supabase/platform-health-monitoring.sql")
  ]);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /Bearer \$\{secret\}/);
  assert.match(policy, /enable row level security/);
  assert.match(policy, /revoke all on table public\.platform_health_incidents from anon, authenticated/);
});

test("document expiry alerts are tenant scoped, deduplicated and cron protected", async()=>{const[route,policy,ui,vercel]=await Promise.all([source("app/api/cron/document-expiry/route.ts"),source("supabase/document-expiry-notifications.sql"),source("components/admin/DocumentExpiryAlerts.tsx"),source("vercel.json")]);assert.match(route,/CRON_SECRET/);assert.match(route,/SUPABASE_SERVICE_ROLE_KEY/);assert.match(route,/RESEND_API_KEY/);assert.match(policy,/unique \(organisation_id, document_id, reminder_stage, expiry_date\)/);assert.match(policy,/enable row level security/);assert.match(policy,/current_user_organisation_id/);assert.match(ui,/Acknowledge/);assert.match(vercel,/api\/cron\/document-expiry/)});

test("retention scanning is review-first, legal-hold aware and privileged", async () => {
  const [migration, cron, route, panel, vercel, docs] = await Promise.all([
    source("supabase/data-retention-lifecycle.sql"),
    source("app/api/cron/retention-review/route.ts"),
    source("app/api/admin/data-lifecycle/route.ts"),
    source("components/admin/DataLifecyclePanel.tsx"),
    source("vercel.json"),
    source("docs/DATA_RETENTION_LIFECYCLE.md")
  ]);
  for (const table of ["retention_schedules", "legal_holds", "retention_review_queue", "retention_action_jobs"]) assert.match(migration, new RegExp(`public\\.${table}`));
  assert.match(migration, /enable row level security/);
  assert.match(migration, /prevent_held_retention_job/);
  assert.match(migration, /seed_organisation_retention_schedules_trigger/);
  assert.match(migration, /current_session_satisfies_privileged_mfa/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /destructiveActionsExecuted: 0/);
  assert.match(route, /verifyServerAccess\(request, "admin", "settings"/);
  assert.match(route, /fullAdminRoles/);
  assert.match(route, /An active legal hold blocks this action/);
  assert.match(panel, /Retention and legal holds/);
  assert.match(panel, /Approved destructive jobs remain paused/);
  assert.match(vercel, /api\/cron\/retention-review/);
  assert.match(docs, /Execution remains disabled/);
});

test("client writes remain manager and organisation scoped", async () => {
  const policy = await source("supabase/repair-client-rls.sql");
  assert.match(policy, /organisation_id = public\.current_user_organisation_id\(\)/);
  assert.match(policy, /public\.current_user_is_manager\(\)/);
  assert.match(policy, /for insert\s+to authenticated\s+with check/s);
  assert.match(policy, /for update\s+to authenticated\s+using/s);
});

test("client saves derive organisation authority on the server", async () => {
  const [records, route] = await Promise.all([
    source("lib/client-records.ts"),
    source("app/api/admin/clients/route.ts")
  ]);
  assert.match(records, /fetch\("\/api\/admin\/clients"/);
  assert.doesNotMatch(records.slice(records.indexOf("export async function saveTenantClient")), /organisation_id: organisationId/);
  assert.match(route, /verifyServerAccess\(request, "admin", "people", "participants\.view_sensitive"\)/);
  assert.match(route, /organisation_id: access\.organisationId/);
  assert.match(route, /belongs to another workspace/);
  assert.match(route, /service_locations.*organisation_id=eq/);
  assert.match(route, /participant_house_assignments/);
});

test("the admin clients workspace keeps a visible add-client action", async () => {
  const [clientsPage, newClientPage] = await Promise.all([
    source("app/admin/clients/page.tsx"),
    source("app/admin/clients/new/page.tsx")
  ]);
  assert.match(clientsPage, /href="\/admin\/clients\/new"/);
  assert.match(clientsPage, />\s*Add client\s*</);
  assert.match(clientsPage, /AdminGate permission="people"/);
  assert.match(newClientPage, /AdminGate permission="people"/);
  assert.match(newClientPage, /AddClientForm/);
});

test("client intake supports sole providers without a house", async () => {
  const form = await source("components/admin/AddClientForm.tsx");
  assert.match(form, /Optional\. Assign a house or service/);
  assert.match(form, /No house assigned/);
  assert.match(form, /save this client now and add a house or service later/);
  assert.doesNotMatch(form, /if \(!primaryHouseId\)/);
  assert.doesNotMatch(form, /<select required[^>]*value=\{primaryHouseId\}/);
});

test("staff invitations remain manager and organisation scoped", async () => {
  const policy = await source("supabase/repair-staff-invites-rls.sql");
  assert.match(policy, /organisation_id = public\.current_user_organisation_id\(\)/);
  assert.match(policy, /public\.current_user_is_manager\(\)/);
  assert.match(policy, /for insert\s+to authenticated\s+with check/s);
  assert.match(policy, /for update\s+to authenticated\s+using/s);
  assert.match(policy, /grant select, insert, update, delete on public\.staff_invites to authenticated/);
});

test("restrictive practice reporting remains separate, tenant scoped, and incident linked", async () => {
  const [policy, records, form, navigation] = await Promise.all([
    source("supabase/restrictive-practice-reporting.sql"),
    source("lib/restrictive-practice-records.ts"),
    source("components/incidents/IncidentReportForm.tsx"),
    source("components/admin/AdminNavigation.tsx")
  ]);
  assert.match(policy, /enable row level security/g);
  assert.match(policy, /organisation_id\s*=\s*public\.current_user_organisation_id\(\)/);
  assert.match(policy, /revoke delete/);
  assert.match(policy, /approval_status text not null default 'Approved'/);
  assert.match(records, /restrictive_practice_authorisations/);
  assert.match(records, /restrictive_practice_uses/);
  assert.match(form, /rpUseId/);
  assert.match(navigation, /Restrictive practices/);
  const workspace = await source("components/admin/RestrictivePracticeWorkspace.tsx");
  assert.match(workspace, /Guidance only\. This explanation is not added to the saved record/);
  assert.match(workspace, /Use intelligence/);
  assert.match(workspace, /Phasing out/);
  assert.match(workspace, /Update lifecycle/);
  assert.doesNotMatch(records, /The person is alone in a room or area/);
});

test("organisation invitations deliver before activating tenant membership", async () => {
  const [inviteRoute, acceptRoute, form, acceptance, migration, emailLock, accessContext, emailDocs] = await Promise.all([
    source("app/api/team/invite/route.ts"),
    source("app/api/team/invite/accept/route.ts"),
    source("components/admin/InviteTeamMemberForm.tsx"),
    source("components/auth/InviteAcceptanceForm.tsx"),
    source("supabase/organisation-invitations.sql"),
    source("supabase/lock-invited-membership-email.sql"),
    source("lib/security/user-access-context.ts"),
    source("docs/AUTH_EMAIL_DELIVERY.md")
  ]);
  assert.match(inviteRoute, /verifyServerAccess\(request, "admin", "team", "staff\.invite"\)/);
  assert.match(inviteRoute, /const emailPattern/);
  assert.match(inviteRoute, /role_escalation/);
  assert.match(inviteRoute, /canHoldAdminFunctions/);
  assert.match(inviteRoute, /canHoldAdminFunctions \? requestedAdminPermissions : \[\]/);
  assert.match(inviteRoute, /organisation_memberships\?select=id&organisation_id=eq\.\$\{access\.organisationId\}/);
  assert.match(inviteRoute, /type: "invite", email, redirect_to: redirectTo/);
  assert.match(inviteRoute, /type: "magiclink", email, redirect_to: redirectTo/);
  assert.match(inviteRoute, /body\.properties\?\.action_link \|\| body\.action_link/);
  assert.match(inviteRoute, /Create password and join/);
  assert.match(acceptance, /requiresPassword \? "Create password and join"/);
  assert.match(inviteRoute, /invite_status: "Draft"[\s\S]*organisation_invites/);
  assert.match(inviteRoute, /status: "failed"/);
  assert.match(inviteRoute, /generatedNewAuthUser.*deleteAuthUser/s);
  assert.doesNotMatch(inviteRoute, /body:\s*JSON\.stringify\(\{[\s\S]*organisation_id:\s*body\./);
  assert.match(form, /sendInvitationEmail\(\{[\s\S]*staffId/);
  assert.match(form, /Access will activate after acceptance/);
  assert.match(acceptRoute, /invite\.email\.trim\(\)\.toLowerCase\(\) !== authUser\.email/);
  assert.ok(acceptRoute.indexOf("invite.email.trim().toLowerCase()") < acceptRoute.indexOf('invite.status === "accepted"'));
  assert.match(acceptRoute, /invited_email: invite\.email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(acceptRoute, /invite\.status === "revoked"/);
  assert.match(acceptRoute, /new Date\(invite\.expires_at\)\.getTime\(\) <= Date\.now\(\)/);
  assert.match(acceptRoute, /organisation_memberships\?on_conflict=organisation_id,user_id/);
  assert.match(acceptance, /Sign in to accept/);
  assert.match(migration, /status in \('pending','sent','accepted','expired','revoked','failed'\)/);
  assert.match(migration, /revoke all on public\.organisation_invites from anon, authenticated/);
  assert.match(emailLock, /add column if not exists invited_email text/);
  assert.match(emailLock, /auth\.jwt\(\) ->> 'email'/);
  assert.match(emailLock, /invited_email is null or lower\(trim\(invited_email\)\) = actor_email/);
  assert.match(accessContext, /invited_email_mismatch/);
  assert.match(accessContext, /Sign in with the email address invited to this workspace/);
  assert.match(emailDocs, /https:\/\/www\.empowernotes\.org\/auth\/accept-invite/);
});

test("roles determine features while dated house assignments determine participant scope", async () => {
  const [migration, unrestrictedMigration, context, invite, accept, form, permissions, houses, clients, clientRoute, roster, selector] = await Promise.all([
    source("supabase/house-scoped-access.sql"),
    source("supabase/unassigned-staff-organisation-client-access.sql"),
    source("lib/security/user-access-context.ts"),
    source("app/api/team/invite/route.ts"),
    source("app/api/team/invite/accept/route.ts"),
    source("components/admin/InviteTeamMemberForm.tsx"),
    source("lib/feature-permissions.ts"),
    source("lib/house-records.ts"),
    source("lib/client-records.ts"),
    source("app/api/admin/clients/route.ts"),
    source("lib/roster-cloud.ts"),
    source("components/dashboard/HouseScopeSelector.tsx")
  ]);
  assert.match(migration, /create table if not exists public\.staff_house_assignments/);
  assert.match(migration, /create table if not exists public\.participant_house_assignments/);
  assert.match(migration, /foreign key \(organisation_id, house_id\)/);
  assert.match(migration, /end_date is null or end_date >= start_date/);
  assert.match(migration, /staff_house_one_open_assignment/);
  assert.match(migration, /prevent_staff_house_assignment_overlap/);
  assert.match(migration, /daterange\(a\.start_date/);
  assert.match(migration, /temporary_house_access_created/);
  assert.match(migration, /participant_house_assignment_ended/);
  assert.match(migration, /Backfilled from existing staff house access/);
  assert.match(migration, /not exists \(select 1 from public\.service_locations h where h\.organisation_id = p\.organisation_id/);
  assert.match(migration, /private\.current_user_can_access_participant/);
  assert.match(unrestrictedMigration, /not exists \([\s\S]*public\.staff_house_assignments sha/);
  assert.match(unrestrictedMigration, /sha\.organisation_id = om\.organisation_id/);
  assert.match(migration, /revoke all on schema private from public, anon/);
  assert.match(migration, /validate_shift_staff_house_eligibility/);
  assert.match(migration, /The selected worker is not assigned to this house on the shift date/);
  assert.match(migration, /switch_active_organisation/);
  assert.match(context, /memberships\.find\(\(item\) => item\.organisation_id === requestedOrganisationId\)/);
  assert.match(context, /requested\.houseId && !activeHouseIds\.includes/);
  assert.match(context, /requested\.participantId && !accessibleParticipantIds\.includes/);
  assert.match(context, /unrestrictedOrganisationAccess = fullOrganisationAccess \|\| assignedHouseIds\.length === 0/);
  assert.match(context, /employmentType/);
  assert.match(invite, /employment_type: employmentType/);
  assert.match(invite, /assignment_start_date: assignmentStartDate/);
  assert.match(accept, /staff_house_assignments/);
  assert.match(accept, /invite\.assignment_end_date/);
  assert.match(form, /Employment type/);
  assert.match(form, /Optional participant-specific access/);
  assert.match(form, /useState<"all" \| "selected">\("all"\)/);
  assert.match(form, /including in-home services/);
  assert.match(form, /rolePermissionTemplates\[role\]/);
  assert.match(permissions, /finance_officer:[\s\S]*billing\.view/);
  assert.doesNotMatch(permissions, /finance_officer:[^\n]*notes\.view/);
  assert.match(houses, /service_locations/);
  assert.match(clients, /\/api\/admin\/clients/);
  assert.match(clientRoute, /participant_house_assignments/);
  assert.match(clientRoute, /organisation_id: access\.organisationId/);
  assert.match(roster, /save_roster_shift_with_(?:staff|service_location)/);
  assert.match(selector, /All my houses/);
  assert.match(selector, /sessionStorage\.removeItem/);
});

test("active workspace remains non-authoritative across RLS, switching, storage and AI", async () => {
  const [migration, resolver, serverAccess, subscription, aiGuard, switchRoute, switcher, storageRoute, documentRecords, jobs] = await Promise.all([
    source("supabase/membership-authority-hardening.sql"),
    source("lib/security/user-access-context.ts"),
    source("lib/security/server-access.ts"),
    source("lib/subscriptions/server-context.ts"),
    source("lib/security/ai-request-guard.ts"),
    source("app/api/access/switch/route.ts"),
    source("components/auth/WorkspaceSwitcher.tsx"),
    source("app/api/storage/sign/route.ts"),
    source("lib/document-records.ts"),
    source("lib/security/tenant-job-context.ts")
  ]);
  assert.match(migration, /Non-authoritative active workspace preference/);
  assert.match(migration, /join public\.organisation_memberships om[\s\S]*om\.access_status = 'active'/);
  assert.match(migration, /idx_org_memberships_user_org_status/);
  assert.match(migration, /current_user_membership_role/);
  assert.match(migration, /organisation_workspace_switched/);
  assert.match(migration, /previous_organisation_id/);
  assert.match(migration, /insert into public\.organisation_memberships[\s\S]*owner_role/);
  assert.match(migration, /set_config\('app\.workspace_switch', 'true', true\)/);
  assert.match(migration, /staff\.assign_houses/);
  assert.doesNotMatch(resolver, /legacyProfiles|legacyProfiles\.filter/);
  assert.match(resolver, /Select an organisation workspace to continue/);
  assert.match(serverAccess, /resolveUserAccessContext/);
  assert.match(subscription, /resolveUserAccessContext/);
  assert.doesNotMatch(subscription, /users\?select=organisation_id,role/);
  assert.match(aiGuard, /gate\.permissions\.includes\(requiredPermission\)/);
  assert.match(switchRoute, /resolveUserAccessContext\(request, \{ organisationId: body\.organisationId \}\)/);
  assert.match(switcher, /switchActiveOrganisation/);
  assert.match(documentRecords, /\/api\/storage\/sign/);
  assert.match(storageRoute, /resolveUserAccessContext\(request, \{ organisationId: pathOrganisationId, participantId \}\)/);
  assert.match(storageRoute, /expiresIn: 300/);
  assert.match(jobs, /Active workspace pointers are never job authority/);
});

test("private document access and lifecycle changes create durable audit events", async () => {
  const [route, migration] = await Promise.all([
    source("app/api/storage/sign/route.ts"),
    source("supabase/document-access-audit.sql")
  ]);
  assert.match(route, /document_download_link_issued/);
  assert.match(route, /\/rest\/v1\/audit_logs/);
  assert.match(route, /signed_url_expires_seconds: 300/);
  assert.match(route, /document_access_audit_failed/);
  assert.match(migration, /after insert or update or delete on public\.documents/);
  assert.match(migration, /document_uploaded/);
  assert.match(migration, /document_verified/);
  assert.match(migration, /document_visibility_changed/);
  assert.match(migration, /document_deleted/);
  assert.match(migration, /insert into public\.audit_logs/);
});

test("staff credential expiry tracking is tenant scoped, audited and advisory", async () => {
  const [panel, records, migration] = await Promise.all([source("components/staff/StaffCredentialPanel.tsx"), source("lib/staff-credential-records.ts"), source("supabase/staff-credential-expiry.sql")]);
  assert.match(panel, /Alerts are advisory and do not block shifts/);
  assert.match(records, /getCurrentOrganisationId/);
  assert.match(migration, /alter table public\.staff_credentials enable row level security/);
  assert.match(migration, /organisation_id = public\.current_user_organisation_id\(\)/);
  assert.match(migration, /staff_credential_added/);
  assert.doesNotMatch(migration, /support_shifts|roster_shifts/);
});

test("handover communication book supports house, client and operational scopes", async () => {
  const [workspace, records, migration, flexibleScope, shell] = await Promise.all([source("components/handover/HandoverWorkspace.tsx"), source("lib/handover-records.ts"), source("supabase/handover-communication-book.sql"), source("supabase/flexible-handover-scope.sql"), source("components/AppShell.tsx")]);
  assert.match(workspace, /Last 24 hours/); assert.match(workspace, /Mark as read/);
  assert.match(records, /getRecentHandovers\(hours = 24\)/);
  assert.match(migration, /private\.current_user_can_access_house\(house_id\)/);
  assert.match(migration, /private\.current_user_can_access_participant\(participant_id\)/);
  assert.match(migration, /handover_acknowledged/); assert.match(shell, /href: "\/handover"/);
  assert.match(flexibleScope, /scope_type = 'house'/);
  assert.match(flexibleScope, /scope_type = 'client'/);
  assert.match(flexibleScope, /scope_type = 'organisation'.*category = 'operational'/s);
  assert.match(flexibleScope, /private\.current_user_can_access_participant\(participant_id\)/);
  assert.match(workspace, /Handover for/);
  assert.match(workspace, /In-home, community or individual support/);
  assert.match(workspace, /Do not include client information/);
  assert.match(workspace, /scopeType === "house" && !houseId/);
  assert.match(workspace, /scopeType === "client" && !participantId/);
  assert.match(records, /scope_type:\s*entry\.scopeType/);
});

test("client appointments can be added by workers, reviewed by admin and shown as reminders", async () => {
  const [records, composer, reminders, notes, dashboard, admin, migration, compactMigration] = await Promise.all([
    source("lib/appointment-records.ts"),
    source("components/appointments/AppointmentComposer.tsx"),
    source("components/appointments/AppointmentRemindersPanel.tsx"),
    source("components/notes/ProgressNoteGenerator.tsx"),
    source("components/dashboard/RoleAwareDashboard.tsx"),
    source("components/admin/AdminDashboard.tsx"),
    source("supabase/client-appointments.sql"),
    source("supabase/appointment-completed-review-footprint.sql")
  ]);
  assert.match(records, /AppointmentStatus = "Needs admin review" \| "Confirmed" \| "Completed" \| "Cancelled"/);
  assert.match(records, /getAppointmentReminderStage/);
  assert.match(records, /overdue-follow-up/);
  assert.match(records, /isCompletedReviewedAppointment/);
  assert.match(records, /admin_reviewed_at/);
  assert.match(composer, /mode: "worker" \| "admin"/);
  assert.match(composer, /Needs review by default/);
  assert.match(composer, /Outcome notes/);
  assert.match(composer, /Admin review note/);
  assert.match(composer, /compactAfterReview/);
  assert.match(composer, /Save appointment/);
  assert.match(reminders, /Appointments will appear here one week before they are due/);
  assert.match(reminders, /Completed appointment/);
  assert.match(reminders, /Open details/);
  assert.match(reminders, /Saved with a smaller footprint/);
  assert.match(notes, /supportType === "Appointment support"/);
  assert.match(notes, /AppointmentComposer mode="worker"/);
  assert.match(dashboard, /AppointmentRemindersPanel/);
  assert.match(admin, /AppointmentComposer mode="admin"/);
  assert.match(admin, /Appointments/);
  assert.match(migration, /create table if not exists public\.client_appointments/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /private\.current_user_can_access_participant\(participant_id, appointment_date\)/);
  assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
  assert.match(compactMigration, /admin_reviewed_at/);
  assert.match(compactMigration, /compact_after_review/);
});

test("worker dashboard opens with a house-scoped incoming handover panel", async () => {
  const [dashboard, panel] = await Promise.all([
    source("components/dashboard/RoleAwareDashboard.tsx"),
    source("components/dashboard/DashboardHandoverPanel.tsx")
  ]);
  assert.match(dashboard, /xl:grid-cols-\[minmax\(0,1fr\)_360px\]/);
  assert.match(dashboard, /<AppointmentRemindersPanel \/>/);
  assert.match(dashboard, /<DashboardHandoverPanel \/>/);
  assert.match(panel, /getRecentHandovers\(24\)/);
  assert.match(panel, /Number\(left\.acknowledged\) - Number\(right\.acknowledged\)/);
  assert.match(panel, /priority\[left\.priority\] - priority\[right\.priority\]/);
  assert.match(panel, /Mark as read/);
  assert.match(panel, /Open communication book/);
});

test("staff writes use the verified server tenant rather than browser supplied organisation data", async () => {
  const [route, client] = await Promise.all([
    source("app/api/team/staff/route.ts"),
    source("lib/staff-records.ts")
  ]);
  assert.match(route, /verifyServerAccess\(request, "admin", "team", "staff\.manage"\)/);
  assert.match(route, /organisation_id: context\.organisationId/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(client, /fetch\("\/api\/team\/staff"/);
  assert.doesNotMatch(client, /supabaseRequest.*staff_invites/s);
});

test("billing headers and lines use atomic database bundles", async () => {
  const [cloudSync, transactionSql] = await Promise.all([
    source("lib/native-billing-cloud.ts"),
    source("supabase/atomic-billing-sync.sql")
  ]);
  assert.match(cloudSync, /supabaseRpc\("sync_service_agreement_bundle"/);
  assert.match(cloudSync, /supabaseRpc\("sync_native_invoice_bundle"/);
  assert.match(transactionSql, /security invoker/);
  assert.match(transactionSql, /Cross-organisation invoice data is not permitted/);
  assert.match(transactionSql, /revoke all on function public\.sync_native_invoice_bundle/);
});

test("shift notes persist against an authorised client and signed-in worker", async () => {
  const [noteRecords, generator] = await Promise.all([
    source("lib/progress-note-records.ts"),
    source("components/notes/ProgressNoteGenerator.tsx")
  ]);

  assert.match(noteRecords, /participant_id:\s*input\.participantId/);
  assert.match(noteRecords, /staff_id:\s*staffId/);
  assert.match(noteRecords, /getCurrentOrganisationId/);
  assert.match(generator, /saveRelatedRecord=\{\(\) => persistProgressNote\("Submitted"\)\}/);
  assert.match(generator, /saveDraftRelatedRecord=\{\(\) => persistProgressNote\("Draft"\)\}/);
  assert.match(generator, /baseParticipants\.map\(\(participant\)/);
});

test("client and shift photos remain private path references", async () => {
  const [migration, repairMigration, clientRecords, noteRecords] = await Promise.all([
    source("supabase/client-and-note-photos.sql"),
    source("supabase/repair-participant-photo-storage-policies.sql"),
    source("lib/client-records.ts"),
    source("lib/progress-note-records.ts")
  ]);

  assert.match(migration, /profile_photo_path text/);
  assert.match(migration, /photo_evidence jsonb/);
  assert.match(clientRecords, /profile_photo_path/);
  assert.match(noteRecords, /participant-documents|uploadTenantDocumentFile/);
  assert.doesNotMatch(noteRecords, /getPublicUrl|publicURL/);
  assert.match(repairMigration, /participant\.id::text = \(storage\.foldername\(storage\.objects\.name\)\)\[2\]/);
  assert.doesNotMatch(repairMigration, /storage\.foldername\(participant\.name\)/);
});

test("shift-note selectors trust Supabase RLS results without empty local-role filtering", async () => {
  const generator = await source("components/notes/ProgressNoteGenerator.tsx");
  assert.match(generator, /storedClients\.length \? storedClients/);
  assert.doesNotMatch(generator, /filterByParticipantAccess\(storedClients/);
  assert.match(generator, /getHousesForClient\(accessibleHouses, selectedParticipant\)/);
});

test("incident selectors trust Supabase RLS results and remain client first", async () => {
  const form = await source("components/incidents/IncidentReportForm.tsx");
  assert.match(form, /storedClients\.length \? storedClients/);
  assert.doesNotMatch(form, /filterByParticipantAccess|filterHousesByAccess/);
  assert.match(form, /getHousesForClient\(accessibleHouses, selectedParticipant\)/);
  assert.match(form, /Who is this incident about\?/);
});

test("submitted incidents expose an actionable admin escalation workflow", async () => {
  const [queue, dashboard, records] = await Promise.all([
    source("components/admin/IncidentReviewQueue.tsx"),
    source("components/admin/AdminDashboard.tsx"),
    source("lib/incident-records.ts")
  ]);
  assert.match(queue, /Escalation priority/);
  assert.match(queue, /Assigned manager/);
  assert.match(queue, /Required actions/);
  assert.match(queue, /escalationDueDate/);
  assert.match(dashboard, /Incident review/);
  assert.match(records, /IncidentEscalationPriority/);
});

test("organisation settings require admin role and assigned settings permission", async () => {
  const page = await source("app/admin/settings/page.tsx");
  assert.match(page, /<AdminGate permission="settings">/);
  assert.doesNotMatch(page, /SettingsSecurityGate/);
  const serverAccess = await source("lib/security/server-access.ts");
  const context = await source("lib/security/user-access-context.ts");
  assert.match(serverAccess, /canAccessAdmin\(context\.role, context\.adminPermissions, requiredPermission\)/);
  assert.match(serverAccess, /adminFeatureMap/);
  assert.match(serverAccess, /PLATFORM_OWNER_EMAILS/);
  assert.doesNotMatch(serverAccess, /mode === "platform" && context\.aal !== "aal2"/);
  assert.match(context, /readAssuranceLevel/);
});

test("password-only organisation access can disable database MFA step-up", async () => {
  const migration = await source("supabase/password-only-organisation-access.sql");
  assert.match(migration, /current_user_requires_privileged_mfa/);
  assert.match(migration, /select false/);
  assert.match(migration, /current_session_satisfies_privileged_mfa/);
  assert.match(migration, /select true/);
  assert.match(migration, /role permissions and tenant RLS/);
});

test("developer console email-link access remains owner restricted, with MFA support available separately", async () => {
  const [auth, panel, serverAccess, platformSignIn, platformGate] = await Promise.all([
    source("lib/supabase-auth.ts"),
    source("components/auth/MfaSecurityPanel.tsx"),
    source("lib/security/server-access.ts"),
    source("components/platform/PlatformEmailSignIn.tsx"),
    source("components/platform/PlatformGate.tsx")
  ]);
  assert.match(auth, /sendMagicLinkSignIn/);
  assert.match(auth, /\/otp\?redirect_to=/);
  assert.match(platformSignIn, /Send sign-in link/);
  assert.match(platformSignIn, /consumeAuthRedirectSession/);
  assert.match(platformGate, /\/platform\/signin\?next=\/platform/);
  assert.match(serverAccess, /PLATFORM_OWNER_EMAILS/);
  assert.doesNotMatch(serverAccess, /mode === "platform" && context\.aal !== "aal2"/);
  assert.match(auth, /\/factors/);
  assert.match(auth, /challenge_id/);
  assert.match(auth, /verifyTotpMfa/);
  assert.match(panel, /factor_type === "totp"/);
  assert.match(panel, /Six-digit code/);
  assert.match(panel, /normaliseQrCode/);
  assert.match(panel, /removeMfaFactor/);
  assert.match(panel, /Open authenticator app/);
});

test("staff and client lifecycle controls are full-admin only and preserve records", async () => {
  const [staffRoute, clientRoute, migration] = await Promise.all([
    source("app/api/team/staff/route.ts"),
    source("app/api/admin/clients/status/route.ts"),
    source("supabase/access-lifecycle-controls.sql")
  ]);
  assert.match(staffRoute, /fullAdminRoles\.has\(context\.role\)/);
  assert.match(staffRoute, /ban_duration/);
  assert.match(clientRoute, /fullAdminRoles\.has\(access\.role\)/);
  assert.match(clientRoute, /participants_or_clients/);
  assert.doesNotMatch(clientRoute, /method:\s*"DELETE"/);
  assert.match(migration, /access_status/);
  assert.match(migration, /participants_or_clients[\s\S]*status/);
  assert.match(migration, /protect_access_lifecycle_fields/);
});

test("controlled manager admin access syncs to the active membership authority", async () => {
  const [staffRoute, navigation, home] = await Promise.all([
    source("app/api/team/staff/route.ts"),
    source("components/admin/AdminNavigation.tsx"),
    source("components/admin/AdminHome.tsx")
  ]);
  assert.match(staffRoute, /syncActiveStaffMembership/);
  assert.match(staffRoute, /organisation_memberships\?on_conflict=organisation_id,user_id/);
  assert.match(staffRoute, /admin_permissions: body\.adminPermissions/);
  assert.match(staffRoute, /resolveMembershipPermissions\(role, body\.featurePermissions, body\.adminPermissions\)/);
  assert.match(staffRoute, /users\?select=id,email&email=eq/);
  assert.doesNotMatch(staffRoute, /users\?select=id,email&id=eq\.\$\{encodeURIComponent\(target\.email\)\}/);
  assert.match(navigation, /canAccessAdmin\(access\.role, access\.permissions, item\.permission\)/);
  assert.match(home, /adminPermissionOptions\.filter\(\(option\) => access\.permissions\.includes\(option\.key\)\)/);
});

test("inactive client billing is limited to services inside the agreement and deactivation boundary", async () => {
  const [billing, workspace, migration] = await Promise.all([
    source("lib/native-billing.ts"),
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("supabase/deactivated-client-billing-boundary.sql")
  ]);
  assert.match(billing, /getInvoiceEligibility/);
  assert.match(billing, /outside the agreed service period/);
  assert.match(billing, /after this client was deactivated/);
  assert.match(workspace, /getTenantClients\(true\)/);
  assert.match(workspace, /!invoiceEligibility\.allowed/);
  assert.match(migration, /before insert or update[\s\S]*on public\.native_invoice_lines/);
  assert.match(migration, /service_started_at > client_deactivated_at/);
});

test("client assignments link invited and authenticated staff identities", async () => {
  const [staffRecords, staffProfiles, teamTable, clientProfiles, migration] = await Promise.all([
    source("lib/staff-records.ts"),
    source("components/staff/StaffProfiles.tsx"),
    source("components/admin/TeamMembersTable.tsx"),
    source("components/participants/ClientProfiles.tsx"),
    source("supabase/link-client-staff-assignments.sql")
  ]);
  assert.match(staffRecords, /isStaffAssignedToClient/);
  assert.match(staffRecords, /staff\.authUserId/);
  assert.match(staffProfiles, /isStaffAssignedToClient\(user, client\)/);
  assert.match(teamTable, /isStaffAssignedToClient\(user, participant\)/);
  assert.doesNotMatch(clientProfiles, /filterByParticipantAccess\(clients\)/);
  assert.match(migration, /assigned_worker_ids/);
  assert.match(migration, /assigned_participant_ids/);
  assert.match(migration, /lower\(app_user\.email\) = lower\(invite\.email\)/);
});

test("voice progress notes submit one final note while preserving source history", async () => {
  const [voice, generator, records, actions] = await Promise.all([
    source("components/voice/VoiceRecorder.tsx"),
    source("components/notes/ProgressNoteGenerator.tsx"),
    source("lib/progress-note-records.ts"),
    source("components/records/RecordActions.tsx")
  ]);
  assert.doesNotMatch(voice, /saveTenantRetainedRecord|saveTranscriptDraft|saveFinalNote/);
  assert.match(voice, /onTranscript\(transcript\)/);
  assert.match(generator, /actionLabel="Submit"/);
  assert.match(records, /rough_note:\s*input\.originalInput/);
  assert.match(records, /final_note:\s*input\.note/);
  assert.match(records, /voice_transcript:\s*input\.voiceTranscript/);
  assert.match(records, /status:\s*input\.status \|\| "Submitted"/);
  assert.match(actions, /actionLabel === "Submit"/);
});

test("note quality stays compact, advisory and detailed for manager review", async () => {
  const [score, generator, records, review, migration] = await Promise.all([
    source("components/notes/NoteQualityScore.tsx"),
    source("components/notes/ProgressNoteGenerator.tsx"),
    source("lib/progress-note-records.ts"),
    source("lib/progress-note-review.ts"),
    source("supabase/progress-note-quality-breakdown.sql")
  ]);
  assert.match(score, /Advisory only\. Draft saving is always available/);
  assert.match(score, /quality\.improvements\.slice\(0, 3\)/);
  assert.match(score, /<details/);
  assert.match(score, /View details/);
  assert.match(score, /aria-label={`Quality score/);
  assert.doesNotMatch(score, /grid gap-3 sm:grid-cols-2/);
  assert.doesNotMatch(generator, /MissingDetailChecker/);
  assert.match(records, /quality_breakdown: input\.qualityBreakdown/);
  assert.match(records, /Keep advisory scoring from blocking a note/);
  assert.match(review, /qualityBreakdown/);
  assert.match(migration, /add column if not exists quality_breakdown jsonb/);
});

test("progress notes use one writing surface for typed, voice and AI content", async () => {
  const [pad, generator, recorder, records, actions, migration] = await Promise.all([
    source("components/notes/ProgressNoteWritingPad.tsx"),
    source("components/notes/ProgressNoteGenerator.tsx"),
    source("components/voice/VoiceRecorder.tsx"),
    source("lib/progress-note-records.ts"),
    source("components/records/RecordActions.tsx"),
    source("supabase/unified-progress-note-editor.sql")
  ]);
  assert.equal((pad.match(/<textarea/g) || []).length, 1);
  assert.match(pad, /progress-note-working-draft/);
  assert.match(pad, /VoiceRecorder compact/);
  assert.match(pad, /Improve note with AI/);
  assert.match(pad, /Read current note aloud/);
  assert.match(pad, /View original/);
  assert.match(pad, /Undo improvement/);
  assert.match(pad, /Note improved - original preserved/);
  assert.match(generator, /type ProgressNoteEditorState/);
  assert.match(generator, /inputMethod: "typed" \| "voice" \| "mixed"/);
  assert.match(generator, /appendParagraph\(current\.workingDraft, cleanTranscript\)/);
  assert.match(generator, /current\.voiceTranscript\.split\("\\n\\n"\)\.includes\(cleanTranscript\)/);
  assert.match(generator, /preImprovementDraft: current\.workingDraft/);
  assert.match(generator, /workingDraft: improved/);
  assert.match(generator, /workingDraft: current\.preImprovementDraft \|\| current\.originalInput/);
  assert.doesNotMatch(generator, /GuidedVoiceDocumentation|Rephrased options/);
  assert.match(recorder, /Recording · \{formatElapsed/);
  assert.match(recorder, /Recording cancelled\. Your note is unchanged/);
  assert.match(records, /original_input: input\.originalInput/);
  assert.match(records, /working_draft: input\.workingDraft/);
  assert.match(records, /ai_improved_version: input\.aiImprovedVersion/);
  assert.match(records, /final_approved_version: input\.finalApprovedVersion/);
  assert.match(actions, /saveDraftRelatedRecord/);
  assert.match(migration, /add value if not exists 'mixed'/);
});

test("workers edit only their own unapproved progress notes and approval is a footnote", async () => {
  const [log, records, policy] = await Promise.all([
    source("components/notes/ProgressNoteLog.tsx"),
    source("lib/progress-note-records.ts"),
    source("supabase/worker-progress-note-edits.sql")
  ]);
  assert.match(log, /canEdit = record\.isOwn && record\.status !== "Approved" && record\.status !== "Locked"/);
  assert.match(log, /Approved progress note\. This record is read-only\./);
  assert.match(log, /record\.status !== "Approved" \? <StatusBadge/);
  assert.match(records, /export async function updateOwnProgressNote/);
  assert.match(records, /Only the worker who wrote this note can edit it/);
  assert.match(policy, /status not in \('Approved', 'Locked'\)/);
  assert.match(policy, /staff_id = \(select auth\.uid\(\)\)/);
});

test("submitted progress notes create traceable pending goal evidence without claiming progress", async () => {
  const [generator, records, goals, migration] = await Promise.all([
    source("components/notes/ProgressNoteGenerator.tsx"),
    source("lib/progress-note-records.ts"),
    source("lib/plan-progress/goal-records.ts"),
    source("supabase/goal-evidence-integrity.sql")
  ]);
  assert.match(generator, /Goals relevant to this note/);
  assert.match(generator, /Pending manager verification after submission/);
  assert.match(records, /status \|\| "Submitted"\) === "Submitted"/);
  assert.match(goals, /source_type: "progress_note"/);
  assert.match(goals, /verification_status: "pending"/);
  assert.doesNotMatch(goals, /suggested_progress_status:/);
  assert.match(records, /goal_evidence_link_failed/);
  assert.match(records, /savedToCloud,/);
  assert.match(migration, /goal\.organisation_id = new\.organisation_id/);
  assert.match(migration, /note\.participant_id = new\.participant_id/);
  assert.match(migration, /note\.status <> 'Draft'/);
  assert.match(migration, /create table if not exists public\.participant_goals/);
  assert.match(migration, /create table if not exists public\.goal_evidence/);
  assert.match(migration, /alter table public\.goal_evidence enable row level security/);
  assert.match(migration, /verification_status = 'pending'/);
});

test("staff dashboard hides management surfaces unless server access is verified", async () => {
  const [dashboard, roleAware, shell, cards, reviews] = await Promise.all([
    source("app/dashboard/page.tsx"),
    source("components/dashboard/RoleAwareDashboard.tsx"),
    source("components/AppShell.tsx"),
    source("components/dashboard/DashboardCards.tsx"),
    source("app/admin/reviews/page.tsx")
  ]);
  assert.match(dashboard, /<RoleAwareDashboard/);
  assert.doesNotMatch(dashboard, /ManagerDashboardCards|DashboardOperationalLists|StaffProfiles/);
  assert.match(roleAware, /\/api\/auth\/access\?mode=admin/);
  assert.match(roleAware, /\{access \? <ManagerDashboardCards/);
  assert.match(roleAware, /can\("team"\) \? <StaffProfiles/);
  assert.match(roleAware, /can\("shift_verification"\)/);
  assert.match(roleAware, /can\("billing"\)/);
  assert.match(shell, /item\.href !== "\/admin" \|\| verifiedAdmin/);
  assert.match(cards, /\/admin\/reviews#note-\$\{encodeURIComponent\(note\.id\)\}/);
  assert.match(reviews, /id=\{`note-\$\{note\.id\}`\}/);
});

test("workers can access only assigned-client direct-care documents", async () => {
  const [access, upload, vault, migration] = await Promise.all([
    source("lib/document-access.ts"),
    source("components/documents/DocumentUploadCard.tsx"),
    source("components/documents/DocumentVault.tsx"),
    source("supabase/protect-client-funding-documents.sql")
  ]);
  assert.match(access, /CHAP/);
  assert.match(access, /Medical Report/);
  assert.match(access, /Occupational Therapy Report/);
  assert.match(access, /Physiotherapy Report/);
  assert.match(access, /Service Agreement/);
  assert.match(access, /Funding Schedule/);
  assert.match(upload, /canManageProtectedDocuments \? \(/);
  assert.match(upload, /Only approved care documents can be uploaded here/);
  assert.match(vault, /isWorkerCareDocumentType\(document\.type\)/);
  assert.match(migration, /enforce_worker_document_scope/);
  assert.match(migration, /is_worker_care_document_type/);
  assert.match(migration, /worker_can_access_participant_file/);
  assert.match(migration, /visibility = 'worker-visible'/);
  assert.match(migration, /assigned_to_participant\(participant_id\)/);
});

test("admin document review is duty controlled and preserves worker visibility boundaries", async () => {
  const [navigation, route, vault, records, permissions, migration] = await Promise.all([
    source("components/admin/AdminNavigation.tsx"),
    source("app/admin/documents/page.tsx"),
    source("components/documents/DocumentVault.tsx"),
    source("lib/document-records.ts"),
    source("lib/feature-permissions.ts"),
    source("supabase/admin-document-vault.sql")
  ]);
  assert.match(navigation, /permission: "documents"/);
  assert.match(route, /AdminGate permission="documents"/);
  assert.match(route, /DocumentVault reviewMode/);
  assert.match(vault, /reviewTenantDocumentRecord/);
  assert.match(records, /method: "PATCH"/);
  assert.match(records, /manager_verified: true/);
  assert.match(permissions, /documents: \["documents\.view", "documents\.manage"\]/);
  assert.match(permissions, /adminPermissionFeatureMap/);
  assert.match(migration, /private\.current_user_has_permission\('documents\.manage'\)/);
  assert.match(migration, /organisation_id = public\.current_user_organisation_id\(\)/);
});

test("shift review decisions persist status, comments and audit history", async () => {
  const [page, review, panel, migration] = await Promise.all([
    source("app/admin/reviews/page.tsx"),
    source("lib/progress-note-review.ts"),
    source("components/approvals/ManagerApprovalPanel.tsx"),
    source("supabase/progress-note-review-actions.sql")
  ]);
  assert.match(page, />Approve</);
  assert.match(page, />Request further details</);
  assert.match(page, />Certify and lock</);
  assert.match(page, /reviewTenantProgressNote/);
  assert.match(review, /review_progress_note/);
  assert.match(review, /latestReview/);
  assert.match(panel, /href="\/admin\/reviews"/);
  assert.doesNotMatch(panel, /setStatuses/);
  assert.match(migration, /insert into public\.approvals/);
  assert.match(migration, /insert into public\.audit_logs/);
  assert.match(migration, /shift_verification/);
  assert.match(migration, /target\.status = 'Locked'/);
});

test("incident review decisions persist manager action and closure history", async () => {
  const [queue, records, migration] = await Promise.all([
    source("components/admin/IncidentReviewQueue.tsx"),
    source("lib/incident-records.ts"),
    source("supabase/incident-review-actions.sql")
  ]);
  assert.match(queue, />Approve and action</);
  assert.match(queue, />Request further details</);
  assert.match(queue, />Certify and close</);
  assert.match(queue, /reviewIncidentReport/);
  assert.doesNotMatch(queue, /Review status/);
  assert.match(records, /review_incident_report/);
  assert.match(records, /structuredReports, \.\.\.retainedOnlyReports/);
  assert.match(migration, /create table if not exists public\.incident_reviews/);
  assert.match(migration, /insert into public\.audit_logs/);
  assert.match(migration, /incident_actioning/);
  assert.match(migration, /target\.status = 'Locked'/);
});

test("agreed billing rates save for explicitly authorised billing managers", async () => {
  const [workspace, billing, atomicSync, repair] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts"),
    source("supabase/atomic-billing-sync.sql"),
    source("supabase/repair-billing-save-permissions.sql")
  ]);
  assert.match(workspace, /await waitForNativeBillingSave\(\)/);
  assert.match(workspace, /setRecords\(getNativeBillingRecords\(\)\)/);
  assert.match(workspace, /getBillingError\(error\)/);
  assert.match(workspace, /addManualServiceAgreementItem/);
  assert.match(workspace, /Agreed support name/);
  assert.match(billing, /export function addManualServiceAgreementItem/);
  assert.match(billing, /pricingVersionId: ""/);
  assert.match(atomicSync, /current_user_can_manage_billing\(\)/);
  assert.doesNotMatch(atomicSync, /not public\.current_user_is_manager\(\)/);
  assert.match(repair, /'billing' = any\(coalesce\(u\.admin_permissions/);
  assert.match(repair, /coalesce\(u\.access_status, 'active'\) = 'active'/);
});

test("participant invoices require an approved NDIS, agreement or manual rate", async () => {
  const [workspace, billing, profiles] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts"),
    source("components/participants/ClientProfiles.tsx")
  ]);
  assert.match(workspace, /Billing period from/);
  assert.match(workspace, /NDIS guide/);
  assert.match(workspace, /Service agreement/);
  assert.match(workspace, /Manual entry/);
  assert.match(workspace, /I authorise/);
  assert.match(workspace, /Include in invoice/);
  assert.match(workspace, /createInvoiceFromServices/);
  assert.match(workspace, /Generate invoice/);
  assert.match(workspace, /Invoice Workspace/);
  assert.match(workspace, /Create invoices from delivered supports/);
  assert.match(workspace, /Select client/);
  assert.match(workspace, /Delivered services/);
  assert.match(workspace, /Billing settings/);
  assert.match(workspace, /clientInvoices\.map/);
  assert.match(workspace, /Billing Exceptions/);
  assert.match(workspace, /Budget Usage/);
  assert.match(workspace, /Invoice History/);
  assert.match(workspace, /Invoice Summary/);
  assert.match(workspace, /Preview Invoice/);
  assert.match(workspace, /Evidence linked/);
  assert.match(workspace, /Evidence review required/);
  assert.match(workspace, /Billing period presets/);
  assert.match(workspace, /new URLSearchParams\(window\.location\.search\)\.get\("clientId"\)/);
  assert.match(workspace, /getInvoicePreview/);
  assert.match(workspace, /Rate exceeds selected NDIS price limit - review required/);
  assert.match(profiles, /\/admin\/billing\?clientId=/);
  assert.match(billing, /export function createInvoiceFromServices/);
  assert.match(billing, /An invoice can only contain services for one participant/);
  assert.match(billing, /agreementItemId/);
  assert.match(billing, /export type InvoiceRateSource = "ndis_catalogue" \| "service_agreement" \| "manual"/);
  assert.match(billing, /Approve the rate and support code for every selected service/);
  assert.match(billing, /export function matchNdisSupportItems/);
  assert.match(billing, /getHoursBetween\(shift\.startTime, shift\.endTime\)/);
  assert.match(billing, /NDIS support item number requires confirmation/);
  assert.match(billing, /invoiceLines: \[\.\.\.lines/);
});

test("two-to-one supports invoice worker-hours once on the participant invoice", async () => {
  const [workspace, billing, cloud] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts"),
    source("lib/native-billing-cloud.ts")
  ]);
  assert.match(billing, /export function getBillableQuantity/);
  assert.match(billing, /duration \* Math\.max\(1, shift\.assignedStaffCount \|\| 1\)/);
  assert.match(billing, /roster ratio does not match the/);
  assert.match(workspace, /service hours ×/);
  assert.match(workspace, /Correct the roster before invoicing/);
  assert.match(cloud, /new Map<string, string\[\]>/);
  assert.match(cloud, /assignedStaffCount: staffIds\.length/);
  assert.match(cloud, /staffing_ratio: shift\.staffingRatio/);
});

test("customer invoices expose support codes without staff identities or clinical notes", async () => {
  const [workspace, pdf, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/invoice-pdf.ts"),
    source("lib/native-billing.ts")
  ]);
  assert.doesNotMatch(pdf, /supportItemName|description|staffName|noteReference/);
  assert.match(pdf, /formatInvoiceDate/);
  assert.match(pdf, /Service date \$\{formatInvoiceDate\(line\.serviceDate\)\}/);
  assert.doesNotMatch(workspace.slice(workspace.indexOf('<h2 className="text-xl font-semibold text-ink">4. Invoices'), workspace.indexOf("function StatusPanel")), /line\.description|line\.supportItemName/);
  assert.match(workspace, /formatInvoiceDisplayDate/);
  assert.match(workspace, /Invoice date \{formatInvoiceDisplayDate\(invoice\.invoiceDate\)\}/);
  const csvSection = billing.slice(billing.indexOf("export function buildInvoiceCsv"), billing.indexOf("export function getEmptyBillingRecords"));
  assert.doesNotMatch(csvSection, /staffName|noteReference|line\.description|line\.supportItemName/);
});

test("provider travel uses odometer evidence and a separately reviewed invoice line", async () => {
  const [billing, workspace, migration] = await Promise.all([
    source("lib/native-billing.ts"),
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("supabase/shift-travel-billing.sql")
  ]);
  assert.match(billing, /updateSupportShiftTravel/);
  assert.match(billing, /odometerEnd - input\.odometerStart/);
  assert.match(billing, /Provider travel - non-labour costs/);
  assert.match(billing, /participant-agreed rate before issuing/i);
  assert.match(workspace, /Odometer start/);
  assert.match(workspace, /Agreed rate per km/);
  assert.match(workspace, /Include on invoice/);
  assert.match(migration, /calculate_shift_travel_kilometres/);
  assert.match(migration, /odometer end reading cannot be lower/i);
});

test("Document Vault agreement rates remain editable drafts until explicit approval", async () => {
  const [workspace, route, billing, upload, migration] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("app/api/billing/parse-service-agreement/route.ts"),
    source("lib/native-billing.ts"),
    source("components/documents/DocumentUploadCard.tsx"),
    source("supabase/document-vault-agreement-parsing.sql")
  ]);
  assert.match(route, /Never infer a rate/);
  assert.match(route, /reviewStatus: "pending"/);
  assert.match(workspace, /Choose a parsed Document Vault agreement/);
  assert.doesNotMatch(workspace, /type="file" accept="\.pdf,\.docx,\.txt"/);
  assert.match(workspace, /Reviewed and approved/);
    assert.match(workspace, /Approve selected rates/);
    assert.match(workspace, /NDIS catalogue comparison/);
    assert.match(workspace, /findAgreementNdisMatch/);
    assert.match(workspace, /addServiceAgreementItem/);
    assert.match(workspace, /getSuggestedRateDraft/);
  assert.match(workspace, /agreementDraftItems\.filter\(\(item\) => item\.approved\)/);
  assert.match(workspace, /updateAgreementDraftItem/);
  assert.match(billing, /"hour" \| "day" \| "week" \| "month" \| "each" \| "km"/);
  assert.match(upload, /Reading agreed rates for review/);
  assert.match(route, /organisation_id: `eq\.\$\{access\.gate\.organisationId!/);
  assert.match(migration, /billing_parsed_terms jsonb/);
});

test("every invoice rate source retains a confirmed NDIS catalogue code", async () => {
  const [workspace, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  assert.match(workspace, /NDIS support item code/);
  assert.match(workspace, /supportItemId: draft\.ndisSupportItemId/);
  assert.doesNotMatch(workspace, /manualSupportItemNumber/);
  assert.match(billing, /Confirm the applicable NDIS support item code for every service/);
  assert.match(billing, /const supportItemNumber = supportItem!\.supportItemNumber/);
  assert.match(billing, /export function buildInvoiceCsv/);
});

test("completed services reconcile automatically before pricing", async () => {
  const [workspace, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  assert.match(workspace, /reconcileCompletedRosterServices/);
  assert.match(workspace, /await waitForNativeBillingSave\(\)/);
  assert.match(workspace, /Preparing pricing options/);
  assert.doesNotMatch(workspace, /Link service|linkingServiceId|ClipboardCheck/);
  assert.match(billing, /export function reconcileCompletedRosterServices/);
  assert.match(billing, /if \(index >= 0\)/);
  assert.match(billing, /const alreadyInvoiced = original\.invoiceLines\.some/);
  assert.match(billing, /!alreadyInvoiced/);
  assert.match(billing, /isServiceDateInsideAgreement\(rosterShift\.shiftDate, agreement\)/);
});

test("invoice pricing requires an explicit exact-price authorisation", async () => {
  const workspace = await source("components/billing/NativeBillingWorkspace.tsx");
  assert.match(workspace, /NDIS guide/);
  assert.match(workspace, /Service agreement/);
  assert.match(workspace, /Manual entry/);
  assert.match(workspace, /Selected price/);
  assert.match(workspace, /selectedLineTotal/);
  assert.match(workspace, /`I authorise \$\{selectedSourceLabel\.toLowerCase\(\)\} pricing at \$\{formatMoney\(selectedLineTotal\)\}`/);
  assert.match(workspace, /price unavailable - authorization blocked/);
  assert.match(workspace, /!hasValidSelectedRate/);
  assert.doesNotMatch(workspace, /pricing at \$\{selectedLineTotal\.toFixed/);
  assert.match(workspace, /source === "service_agreement" && !availableAgreementItems\.length/);
  assert.match(workspace, /No approved service-agreement rates are available/);
  assert.match(workspace, /openBillingSetup\(\)/);
  assert.doesNotMatch(workspace, /disabled=\{source === "service_agreement" && !availableAgreementItems\.length\}/);
});

test("invoice actions respond clearly and expose CSV before and after generation", async () => {
  const [workspace, cloud] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing-cloud.ts")
  ]);
  assert.match(workspace, /function toggleInvoicePreview\(\)/);
  assert.match(workspace, /Select Include in invoice on at least one delivered service first/);
  assert.match(workspace, /function exportInvoicePreviewCsv\(\)/);
  assert.match(workspace, /Invoice preview downloaded as CSV/);
  assert.match(workspace, /setShowInvoiceHistory\(true\)/);
  assert.match(workspace, /open=\{showInvoiceHistory\}/);
  assert.doesNotMatch(workspace, /disabled=\{creatingInvoiceId === "batch" \|\| !Object\.values\(selectedInvoiceServices\)\.some\(Boolean\)\}/);
  assert.match(workspace, /generateHolisticInvoice\(true\)/);
  assert.match(workspace, /Generate & download PDF/);
  assert.match(workspace, /Creating your branded invoice PDF/);
  assert.match(workspace, /const pdfWindow = downloadPdf \? openInvoicePdfWindow\(\) : null/);
  assert.match(workspace, /await exportInvoicePdf\(result\.invoice, pdfWindow\)/);
  assert.match(workspace, /pdfWindow\.location\.replace\(downloadUrl\)/);
  assert.match(workspace, /PDF download started/);
  assert.match(workspace, /createInvoiceFromServices\(selections, notes, selectedClient, true\)/);
  assert.match(workspace, /saveNativeInvoiceBundleToCloud\(result\.invoice, result\.lines\)/);
  assert.match(cloud, /export async function saveNativeInvoiceBundleToCloud/);
  assert.match(cloud, /invoice_rows: \[toInvoiceCloudRow\(invoice, organisationId, userId\)\]/);
});

test("client-first invoicing auto-selects eligible services without weakening evidence or agreement links", async () => {
  const workspace = await source("components/billing/NativeBillingWorkspace.tsx");
  assert.match(workspace, /Eligible, uninvoiced services are selected automatically/);
  assert.match(workspace, /autoSelectionKey/);
  assert.match(workspace, /getInvoiceEligibility\(service\.startTime\.slice\(0, 10\), agreement, selectedClient, service\.startTime\)\.allowed/);
  assert.match(workspace, /line\.shiftId === service\.id && line\.approvalStatus !== "needs_correction"/);
  assert.match(workspace, /Evidence linked/);
  assert.match(workspace, /Choose a parsed Document Vault agreement/);
  assert.match(workspace, /\['ndis_catalogue', 'NDIS guide'\]/);
  assert.match(workspace, /\['service_agreement', 'Service agreement'\]/);
  assert.match(workspace, /\['manual', 'Manual entry'\]/);
});

test("completed uninvoiced services populate the client billing period automatically", async () => {
  const workspace = await source("components/billing/NativeBillingWorkspace.tsx");
  assert.match(workspace, /const autoPeriodKey = useRef/);
  assert.match(workspace, /service\.status === "completed" && !invoicedShiftIds\.has\(service\.id\)/);
  assert.match(workspace, /setInvoicePeriodStart\(uninvoicedDates\[0\]\)/);
  assert.match(workspace, /setInvoicePeriodEnd\(uninvoicedDates\[uninvoicedDates\.length - 1\]\)/);
  assert.match(workspace, /Period populated from uninvoiced delivered services/);
  assert.match(workspace, /formatBillingFrequency\(selectedAgreement\.billingFrequency\)/);
});

test("service agreement updates preserve dates and relink eligible uninvoiced services", async () => {
  const [workspace, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  assert.match(workspace, /agreement\?\.startDate/);
  assert.match(workspace, /updateServiceAgreement\(selectedAgreement\.id, agreementInput\)/);
  assert.match(billing, /export function updateServiceAgreement/);
  assert.match(billing, /!invoicedShiftIds\.has\(shift\.id\)/);
  assert.match(billing, /isServiceDateInsideAgreement\(shift\.startTime\.slice\(0, 10\), agreement\)/);
  assert.match(billing, /existing\.serviceAgreementId !== agreement\.id/);
});

test("invoice workspace renders durable completed services with delivered hours", async () => {
  const workspace = await source("components/billing/NativeBillingWorkspace.tsx");
  assert.match(workspace, /const deliveredServices = selectedClient \? records\.shifts\.filter/);
  assert.match(workspace, /service\.status === "completed"/);
  assert.match(workspace, /const deliveredHours = deliveredServices\.reduce/);
  assert.match(workspace, /Services rendered/);
  assert.match(workspace, /Hours delivered/);
  assert.match(workspace, /invoiceServiceRows\.map/);
  assert.doesNotMatch(workspace, /Select linked services|Link service/);
});

test("linked services can select any active NDIS service price", async () => {
  const workspace = await source("components/billing/NativeBillingWorkspace.tsx");
  assert.match(workspace, /Search code, service or category/);
  assert.match(workspace, /getActiveNdisItemsForService/);
  assert.match(workspace, /filterNdisItems/);
  assert.match(workspace, /item\.priceLimit !== null/);
  assert.match(workspace, /agreementRate\?\.supportItemId \|\| rateDraft\.ndisSupportItemId/);
  assert.doesNotMatch(workspace.slice(workspace.indexOf("NDIS support item code"), workspace.indexOf("NDIS advised rate")), /ndisMatches\.map/);
});

test("official NDIA catalogue rows power date-aware invoice recommendations", async () => {
  const [workspace, route, billing, cloud] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("app/api/billing/import-ndis-catalogue/route.ts"),
    source("lib/native-billing.ts"),
    source("lib/native-billing-cloud.ts")
  ]);
  assert.match(workspace, /Official NDIS support catalogue/);
  assert.match(workspace, /Invoice recommendations now use this catalogue by service date/);
  assert.match(route, /verifyServerAccess\(request, "admin", "billing", "billing\.manage"\)/);
  assert.match(route, /National Disability Insurance Agency/);
  assert.match(route, /status: "draft"/);
  assert.match(route, /checksum: createHash\("sha256"\)/);
  assert.match(route, /organisation_id: access\.organisationId/);
  assert.match(route, /regionalPriceColumns/);
  assert.match(billing, /item\.timeBand/);
  assert.match(cloud, /state_or_region: item\.stateOrRegion/);
  assert.match(cloud, /remote_type: item\.remoteType/);
});

test("invoice workspace preserves cloud pricing and exposes explicit generation and exports", async () => {
  const [workspace, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  assert.match(workspace, /reconcileCompletedRosterServices\([\s\S]*cloudRecords\)/);
  assert.match(billing, /sourceRecords: NativeBillingRecords = getNativeBillingRecords\(\)/);
  assert.match(workspace, /Generate invoice/);
  assert.match(workspace, /Download PDF/);
  assert.match(workspace, /Download CSV/);
  assert.match(workspace, /rateDraft\.ndisSupportItemId\)\?\.unitType/);
});

test("delivered supports preselect a defensible NDIS code while retaining pricing choice", async () => {
  const [workspace, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  assert.match(workspace, /next\[service\.id\] = getSuggestedRateDraft\(service, records\)/);
  assert.match(workspace, /item\.participantId === billingService\.participantId/);
  assert.match(workspace, /aria-pressed=\{rateDraft\.source === source\}/);
  assert.match(workspace, /Suggested from \{billingService\.supportType\}\. Confirm before invoicing\./);
  assert.match(workspace, /\['ndis_catalogue', 'NDIS guide'\]/);
  assert.match(workspace, /\['service_agreement', 'Service agreement'\]/);
  assert.match(workspace, /\['manual', 'Manual entry'\]/);
  assert.match(billing, /expandNdisServiceTerms/);
  assert.match(billing, /inferNdisTimeBand/);
  assert.match(billing, /match\.confidence >= 20/);
});

test("NDIS pricing never presents missing catalogue values as zero-dollar rates", async () => {
  const [workspace, cloud, billing, route] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing-cloud.ts"),
    source("lib/native-billing.ts"),
    source("app/api/billing/import-ndis-catalogue/route.ts")
  ]);
  assert.match(cloud, /Number\.isFinite\(number\) && number > 0 \? number : null/);
  assert.match(billing, /typeof item\.priceLimit === "number" && item\.priceLimit > 0/);
  assert.match(workspace, /formatPositiveRate/);
  assert.match(workspace, /No active priced NDIS catalogue/);
  assert.match(route, /price_limit=gt\.0/);
  assert.match(route, /cannot be activated/);
});

test("official NDIS pricing updates remain draft until the platform owner publishes them", async () => {
  const [monitor, route, cron, panel, migration, vercel] = await Promise.all([
    source("lib/ndis-pricing-monitor.ts"), source("app/api/platform/ndis-pricing/route.ts"),
    source("app/api/cron/ndis-pricing-monitor/route.ts"), source("components/platform/NdisPricingMonitorPanel.tsx"),
    source("supabase/central-ndis-pricing-monitor.sql"), source("vercel.json")
  ]);
  assert.match(monitor, /ALLOWED_HOSTS/);
  assert.match(monitor, /status: "draft"/);
  assert.match(monitor, /organisation_id: null/);
  assert.match(monitor, /automatic_official_ndis_csv/);
  assert.match(monitor, /publishPlatformNdisPricing/);
  assert.match(route, /verifyServerAccess\(request,"platform"\)/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(panel, /Automatic checks create drafts/);
  assert.match(panel, /Publish reviewed version/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from anon, authenticated/);
  assert.match(vercel, /ndis-pricing-monitor/);
});

test("official NDIS XLSX catalogues are parsed into reviewed drafts before publication", async () => {
  const [parser, importer, monitor, workspace, platformRoute, platformPanel] = await Promise.all([
    source("lib/ndis-catalogue-parser.ts"),
    source("app/api/billing/import-ndis-catalogue/route.ts"),
    source("lib/ndis-pricing-monitor.ts"),
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("app/api/platform/ndis-pricing/route.ts"),
    source("components/platform/NdisPricingMonitorPanel.tsx")
  ]);
  assert.match(parser, /JSZip\.loadAsync/);
  assert.match(parser, /DOMParser/);
  assert.match(parser, /maxWorksheetXmlBytes/);
  assert.match(importer, /\.\(csv\|xlsx\)\$/);
  assert.match(monitor, /what-support-catalogue/);
  assert.match(monitor, /Mozilla\/5\.0/);
  assert.match(monitor, /\/media\/8038\/download\?attachment/);
  assert.match(monitor, /support catalogue/);
  assert.match(monitor, /content-disposition/);
  assert.match(monitor, /automatic_official_ndis_xlsx/);
  assert.match(monitor, /status: "draft"/);
  assert.match(monitor, /importOfficialNdisPricingUpload/);
  assert.match(monitor, /blocked the automated check/);
  assert.match(platformRoute, /multipart\/form-data/);
  assert.match(platformPanel, /Import official catalogue/);
  assert.match(platformPanel, /Effective from/);
  assert.match(workspace, /accept="\.xlsx,\.csv/);
});

test("published NDIS pricing exposes common service fees from the live catalogue", async () => {
  const [monitor, panel] = await Promise.all([
    source("lib/ndis-pricing-monitor.ts"),
    source("components/platform/NdisPricingMonitorPanel.tsx")
  ]);
  assert.match(monitor, /pricing_version_id=eq\.\$\{encodeURIComponent\(activeVersion\.id\)\}/);
  assert.match(monitor, /price_limit=gt\.0/);
  assert.match(monitor, /selectCommonServiceFees/);
  assert.match(panel, /Common service fees/);
  assert.match(panel, /Representative maximum prices from the live catalogue/);
  assert.match(panel, /support_item_number/);
  assert.match(panel, /state_or_region/);
  assert.match(panel, /remote_type/);
});

test("official NDIS catalogue relay is scheduled, secret protected and checksum idempotent", async () => {
  const [workflow, endpoint, monitor] = await Promise.all([
    source(".github/workflows/ndis-catalogue-relay.yml"),
    source("app/api/cron/ndis-catalogue-ingest/route.ts"),
    source("lib/ndis-pricing-monitor.ts")
  ]);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /ndis\.gov\.au\/providers\/pricing-and-payments\/pricing\/what-support-catalogue/);
  assert.match(workflow, /NDIS_CATALOGUE_INGEST_SECRET/);
  assert.match(workflow, /head -c 2/);
  assert.match(endpoint, /timingSafeEqual/);
  assert.match(endpoint, /NDIS_CATALOGUE_INGEST_SECRET/);
  assert.match(endpoint, /importOfficialNdisPricingUpload/);
  assert.match(monitor, /No duplicate draft was created/);
  assert.match(monitor, /previous\?\.detected_checksum === checksum/);
});

test("AI NDIS matching is candidate-bound, privacy-minimised and never self-approves", async () => {
  const [route, workspace, guard] = await Promise.all([
    source("app/api/billing/match-ndis-service/route.ts"),
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/security/ai-request-guard.ts")
  ]);
  assert.match(route, /permission: "billing\.manage"/);
  assert.match(route, /rateLimitAction: "transcribe_note"/);
  assert.match(route, /slice\(0, maxCandidates\)/);
  assert.match(route, /candidates\.some\(\(candidate\) => candidate\.id === candidateId\)/);
  assert.match(route, /Never create a code, candidate, rate or service fact/);
  assert.doesNotMatch(route, /participantName|clientName|staffName|progressNote|diagnosis/);
  assert.match(guard, /match_ndis_service/);
  assert.match(workspace, /source === "ndis_catalogue"\) void rankNdisPricing/);
  assert.match(workspace, /approved: false/);
  assert.match(workspace, /Human authorisation is required/);
  assert.doesNotMatch(workspace, /service: \{[^}]*participantName/);
});

test("invoice service presets broaden catalogue matching without entering clinical context on invoices", async () => {
  const [presets, workspace, billing] = await Promise.all([
    source("lib/invoice-service-presets.ts"),
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  for (const label of ["Personal care and self-care", "Community and social participation", "Dysphagia-related eating and drinking assistance", "Continence support", "Community nursing", "Occupational therapy", "Provider travel and kilometres"]) assert.match(presets, new RegExp(label));
  assert.match(workspace, /Service delivered/);
  assert.match(workspace, /clinicalContext/);
  assert.match(workspace, /Clinical context is not printed on the invoice/);
  assert.match(workspace, /rankNdisPricing\(billingService, presetId, true\)/);
  assert.match(billing, /const supportItemName = supportItem!\.supportItemName/);
  assert.match(billing, /description: supportItemNumber/);
  assert.doesNotMatch(billing, /description:.*servicePreset|description:.*clinicalContext/);
});

test("marketing attribution is first party, bounded, platform private and Stripe authoritative", async () => {
  const [client, attribution, server, events, signup, webhook, migration, layout, panel] = await Promise.all([
    source("lib/marketing/client.ts"), source("lib/marketing/attribution.ts"), source("lib/marketing/server.ts"),
    source("app/api/marketing/events/route.ts"), source("app/api/marketing/signup/route.ts"),
    source("app/api/stripe/webhook/route.ts"), source("supabase/marketing-attribution-v1.sql"),
    source("app/layout.tsx"), source("components/platform/MarketingAttributionPanel.tsx")
  ]);
  assert.match(client, /crypto\.randomUUID/);
  assert.match(client, /empower_visitor_id/);
  assert.match(client, /oppref/);
  assert.match(client, /gclid/);
  assert.match(attribution, /openai_ads/);
  assert.match(attribution, /google_ads/);
  assert.match(server, /marketingEventNames\.includes/);
  assert.match(server, /allowedMetadata/);
  assert.match(server, /isConversionEvent\(eventName\)/);
  assert.match(server, /user_id:\s*null/);
  assert.match(server, /organisation_id:\s*null/);
  assert.doesNotMatch(server, /participant_name|ndis_number|progress_note|incident_text|medical_condition|support_plan|medication|restrictive_practice|auth_token/);
  assert.match(events, /content-length/);
  assert.match(signup, /resolveUserAccessContext/);
  assert.match(webhook, /recordSubscriptionMarketingConversion/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /revoke all .* from anon,authenticated/g);
  assert.match(layout, /MarketingAttribution/);
  assert.match(panel, /First-party attribution/);
});

test("OpenAI chat requests disable provider-side response storage", async () => {
  for (const file of [
    "app/api/ai/improve-note/route.ts",
    "app/api/ask-empower/route.ts",
    "app/api/plan-progress/parse/route.ts",
    "app/api/billing/match-ndis-service/route.ts",
    "app/api/billing/parse-service-agreement/route.ts",
    "app/api/roster/availability-parse/route.ts"
  ]) {
    assert.match(await source(file), /store:\s*false/, `${file} must disable OpenAI response storage`);
  }
});

test("Ask Empower is signed-in, system-aware and app-scoped only", async () => {
  const [route, knowledge, widget, shell] = await Promise.all([
    source("app/api/ask-empower/route.ts"),
    source("lib/ask-empower-knowledge.ts"),
    source("components/ask-empower/AskEmpowerWidget.tsx"),
    source("components/AppShell.tsx")
  ]);
  assert.match(route, /resolveUserAccessContext\(request\)/);
  assert.match(knowledge, /I can only help with EmpowerNotes features/);
  assert.match(route, /store:\s*false/);
  assert.match(route, /Do not provide clinical advice, legal advice, financial advice/);
  assert.match(route, /Billing answers must explain EmpowerNotes plan and account steps only/);
  assert.match(route, /Do not claim access to private records/);
  assert.match(route, /isAskEmpowerQuestionInScope/);
  assert.match(knowledge, /Ask Empower is an in-app assistant/);
  assert.match(knowledge, /14-day free trial/);
  assert.match(knowledge, /Solo is A\$49\.99\/month for 1 active user/);
  assert.match(knowledge, /Practice is A\$129\.99\/month for up to 5 active users/);
  assert.match(knowledge, /Provider is A\$299\.99\/month for up to 20 active users/);
  assert.match(knowledge, /Subscription billing is separate from client invoicing/);
  assert.match(knowledge, /Workers and frontline staff should not see subscription payment prompts/);
  assert.match(knowledge, /outsideScopeTerms/);
  assert.match(widget, /Ask Empower/);
  assert.match(widget, /Features, plans and billing/);
  assert.match(widget, /bottom-5 right-5/);
  assert.match(widget, /\/api\/ask-empower/);
  assert.match(shell, /signedIn \? <AskEmpowerWidget \/> : null/);
});

test("advertising tracking is excluded from authenticated care routes", async () => {
  const tracker = await source("components/marketing/MarketingAttribution.tsx");
  assert.match(tracker, /publicRoutes/);
  for (const path of ["participants", "notes", "incidents", "documents", "billing", "handover", "restrictive-practices"]) {
    assert.doesNotMatch(tracker, new RegExp(`/${path}`));
  }
});

test("participant invoicing and the EmpowerNotes subscription remain separate", async () => {
  const [invoicePage, planPage, navigation, subscriptionWorkspace] = await Promise.all([
    source("app/admin/billing/page.tsx"),
    source("app/admin/plan-billing/page.tsx"),
    source("components/admin/AdminNavigation.tsx"),
    source("components/billing/SubscriptionWorkspace.tsx")
  ]);
  assert.match(invoicePage, /title="Invoicing"/);
  assert.doesNotMatch(invoicePage, /PlanManagementCard|UsageSummary/);
  assert.match(planPage, /title="Plan & billing"/);
  assert.match(navigation, /label: "Invoicing"/);
  assert.match(navigation, /label: "Plan & billing"[\s\S]*fullAdminOnly: true/);
  assert.match(subscriptionWorkspace, /fullAdminRoles\.has/);
});

test("staff hours reports total completed work across payroll periods", async () => {
  const [roster, reports] = await Promise.all([
    source("lib/roster.ts"),
    source("components/roster/RosterStatusReports.tsx")
  ]);
  assert.match(roster, /getStaffHoursSummary/);
  assert.match(roster, /\["Completed", "Note Completed"\]/);
  assert.match(roster, /getShiftAssignedWorkers\(shift\)/);
  assert.match(roster, /if \(end < start\) end \+= 24 \* 60/);
  assert.match(reports, /Staff hours for pay preparation/);
  assert.match(reports, /weekly/);
  assert.match(reports, /fortnightly/);
  assert.match(reports, /monthly/);
  assert.match(reports, /downloadStaffHoursCsv/);
  assert.match(reports, /Daily breakdown/);
  assert.match(reports, /worker\.days\.map/);
  assert.match(roster, /existing\.days\.find/);
});

test("platform subscription payments are owner-only, idempotent and risk-aged", async () => {
  const [webhook, stripe, summary, dashboard, migration] = await Promise.all([
    source("app/api/stripe/webhook/route.ts"),
    source("lib/stripe/server.ts"),
    source("app/api/platform/summary/route.ts"),
    source("components/platform/PlatformDashboard.tsx"),
    source("supabase/platform-subscription-payment-ledger.sql")
  ]);
  assert.match(webhook, /recordSubscriptionInvoice/);
  assert.match(stripe, /on_conflict=stripe_invoice_id/);
  assert.match(stripe, /resolution=merge-duplicates/);
  assert.match(summary, /verifyServerAccess\(request, "platform"\)/);
  assert.match(summary, /60 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(summary, /lifetimePaidCents/);
  assert.match(dashboard, /Subscription payment ledger/);
  assert.match(dashboard, /Monthly provider payment comparison/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from anon, authenticated/);
});

test("NDIS invoice code and price matching reports privacy-safe success and failure rates", async () => {
  const [matcher, operations, visual, migration] = await Promise.all([
    source("app/api/billing/match-ndis-service/route.ts"),
    source("app/api/platform/operations/route.ts"),
    source("components/platform/PlatformVisualIntelligence.tsx"),
    source("supabase/ndis-invoice-match-telemetry.sql")
  ]);
  assert.match(matcher, /recordMatchEvent/);
  assert.match(matcher, /no_priced_candidates/);
  assert.match(matcher, /selected_support_item_number/);
  assert.match(matcher, /selected_price/);
  assert.match(operations, /ndis_invoice_match_events/);
  assert.match(operations, /ndisMatchEvents/);
  assert.match(visual, /NDIS invoice matching/);
  assert.match(visual, /Success rate/);
  assert.match(visual, /Rules fallback/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from anon, authenticated/);
  assert.doesNotMatch(migration, /participant_id|participant_name|service_narrative|note_content|diagnosis/);
});

test("developer API monitoring separates availability, failures and credential expiry", async () => {
  const [health, cron, history, panel, migration] = await Promise.all([
    source("lib/platform-health.ts"),
    source("app/api/cron/platform-health/route.ts"),
    source("app/api/platform/health/incidents/route.ts"),
    source("components/platform/SystemHealthPanel.tsx"),
    source("supabase/platform-api-health-observations.sql")
  ]);
  assert.match(health, /available: true/);
  assert.match(health, /available: false/);
  assert.match(health, /_EXPIRES_AT/);
  assert.match(health, /Credential expires in/);
  assert.match(cron, /platform_api_health_observations/);
  assert.match(cron, /check\.available/);
  assert.match(history, /apiObservations/);
  assert.match(panel, /API reliability/);
  assert.match(panel, /Failure rate/);
  assert.match(panel, /Last success/);
  assert.match(panel, /Last failure/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from anon, authenticated/);
  assert.doesNotMatch(migration, /secret_value|api_key|access_token/);
});

test("service agreement extraction recovers modern PDFs and preserves retryable vault records", async () => {
  const [extractor, route, vault, planParser, billing] = await Promise.all([
    source("lib/document-text-extraction.ts"),
    source("app/api/billing/parse-service-agreement/route.ts"),
    source("components/documents/DocumentVault.tsx"),
    source("app/api/plan-progress/parse/route.ts"),
    source("components/billing/NativeBillingWorkspace.tsx")
  ]);
  assert.match(extractor, /v2\.0\.550/);
  assert.match(extractor, /damaged internal index/);
  assert.match(route, /markParseFailed/);
  assert.match(route, /billing_parse_status: "failed"/);
  assert.match(route, /documentSaved/);
  assert.match(vault, /Retry rate extraction/);
  assert.match(vault, /parse-service-agreement/);
  assert.match(planParser, /extractPdfText/);
  assert.match(billing, /toggleBillingSetup/);
  assert.match(billing, /scrollIntoView/);
  assert.match(billing, /aria-expanded/);
  assert.match(billing, /select to retry extraction/);
  assert.match(billing, /retryVaultAgreement/);
});

test("maintenance mode preserves reads while blocking application and storage writes", async () => {
  const [middleware, maintenance, rest, documents, layout, workflow, runbook] = await Promise.all([
    source("middleware.ts"), source("lib/maintenance.ts"), source("lib/supabase-rest.ts"),
    source("lib/document-records.ts"), source("app/layout.tsx"), source(".github/workflows/quality.yml"),
    source("docs/DATA_PROTECTION_AND_RECOVERY.md")
  ]);
  assert.match(maintenance, /NEXT_PUBLIC_READ_ONLY_MAINTENANCE/);
  assert.match(middleware, /\["GET", "HEAD", "OPTIONS"\]/);
  assert.match(middleware, /status: 503/);
  assert.match(middleware, /api\/stripe\/webhook/);
  assert.match(rest, /options\.method !== "GET"/);
  assert.match(rest, /options\.write/);
  assert.match(documents, /maintenanceWriteError/);
  assert.match(layout, /MaintenanceBanner/);
  assert.match(workflow, /check:sql-safety/);
  assert.match(runbook, /Database backups do not restore deleted Storage objects/);
  assert.match(runbook, /Restore exercise/);
});
