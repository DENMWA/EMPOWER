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
  assert.doesNotMatch(access, /users\?select=role,organisation_id/);
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
  assert.doesNotMatch(shell, /canAccessAdmin\(currentUser\.role\)/);
  assert.match(shell, /pathname\.startsWith\("\/admin"\).*verifiedAdmin/);
  assert.match(gate, /router\.replace\("\/dashboard"\)/);
  assert.match(gate, /\/api\/auth\/access\?mode=admin/);
});

test("platform analytics endpoint requires platform-owner verification", async () => {
  const route = await source("app/api/platform/summary/route.ts");
  assert.match(route, /verifyServerAccess\(request, "platform"\)/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
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

test("client writes remain manager and organisation scoped", async () => {
  const policy = await source("supabase/repair-client-rls.sql");
  assert.match(policy, /organisation_id = public\.current_user_organisation_id\(\)/);
  assert.match(policy, /public\.current_user_is_manager\(\)/);
  assert.match(policy, /for insert\s+to authenticated\s+with check/s);
  assert.match(policy, /for update\s+to authenticated\s+using/s);
});

test("staff invitations remain manager and organisation scoped", async () => {
  const policy = await source("supabase/repair-staff-invites-rls.sql");
  assert.match(policy, /organisation_id = public\.current_user_organisation_id\(\)/);
  assert.match(policy, /public\.current_user_is_manager\(\)/);
  assert.match(policy, /for insert\s+to authenticated\s+with check/s);
  assert.match(policy, /for update\s+to authenticated\s+using/s);
  assert.match(policy, /grant select, insert, update, delete on public\.staff_invites to authenticated/);
});

test("organisation invitations deliver before activating tenant membership", async () => {
  const [inviteRoute, acceptRoute, form, acceptance, migration, emailDocs] = await Promise.all([
    source("app/api/team/invite/route.ts"),
    source("app/api/team/invite/accept/route.ts"),
    source("components/admin/InviteTeamMemberForm.tsx"),
    source("components/auth/InviteAcceptanceForm.tsx"),
    source("supabase/organisation-invitations.sql"),
    source("docs/AUTH_EMAIL_DELIVERY.md")
  ]);
  assert.match(inviteRoute, /verifyServerAccess\(request, "admin", "team", "staff\.invite"\)/);
  assert.match(inviteRoute, /const emailPattern/);
  assert.match(inviteRoute, /role_escalation/);
  assert.match(inviteRoute, /organisation_memberships\?select=id&organisation_id=eq\.\$\{access\.organisationId\}/);
  assert.match(inviteRoute, /type: "invite", email, redirect_to: redirectTo/);
  assert.match(inviteRoute, /invite_status: "Draft"[\s\S]*organisation_invites/);
  assert.match(inviteRoute, /status: "failed"/);
  assert.match(inviteRoute, /generatedNewAuthUser.*deleteAuthUser/s);
  assert.match(inviteRoute, /Accept EmpowerNotes invitation/);
  assert.doesNotMatch(inviteRoute, /body:\s*JSON\.stringify\(\{[\s\S]*organisation_id:\s*body\./);
  assert.match(form, /sendInvitationEmail\(\{[\s\S]*staffId/);
  assert.match(form, /Access will activate after acceptance/);
  assert.match(acceptRoute, /invite\.email\.trim\(\)\.toLowerCase\(\) !== authUser\.email/);
  assert.match(acceptRoute, /invite\.status === "revoked"/);
  assert.match(acceptRoute, /new Date\(invite\.expires_at\)\.getTime\(\) <= Date\.now\(\)/);
  assert.match(acceptRoute, /organisation_memberships\?on_conflict=organisation_id,user_id/);
  assert.match(acceptance, /Sign in to accept/);
  assert.match(migration, /status in \('pending','sent','accepted','expired','revoked','failed'\)/);
  assert.match(migration, /revoke all on public\.organisation_invites from anon, authenticated/);
  assert.match(emailDocs, /https:\/\/www\.empowernotes\.org\/auth\/accept-invite/);
});

test("roles determine features while dated house assignments determine participant scope", async () => {
  const [migration, context, invite, accept, form, permissions, houses, clients, roster, selector] = await Promise.all([
    source("supabase/house-scoped-access.sql"),
    source("lib/security/user-access-context.ts"),
    source("app/api/team/invite/route.ts"),
    source("app/api/team/invite/accept/route.ts"),
    source("components/admin/InviteTeamMemberForm.tsx"),
    source("lib/feature-permissions.ts"),
    source("lib/house-records.ts"),
    source("lib/client-records.ts"),
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
  assert.match(migration, /revoke all on schema private from public, anon/);
  assert.match(migration, /validate_shift_staff_house_eligibility/);
  assert.match(migration, /The selected worker is not assigned to this house on the shift date/);
  assert.match(migration, /switch_active_organisation/);
  assert.match(context, /memberships\.find\(\(item\) => item\.organisation_id === requestedOrganisationId\)/);
  assert.match(context, /requested\.houseId && !activeHouseIds\.includes/);
  assert.match(context, /requested\.participantId && !accessibleParticipantIds\.includes/);
  assert.match(context, /employmentType/);
  assert.match(invite, /employment_type: employmentType/);
  assert.match(invite, /assignment_start_date: assignmentStartDate/);
  assert.match(accept, /staff_house_assignments/);
  assert.match(accept, /invite\.assignment_end_date/);
  assert.match(form, /Employment type/);
  assert.match(form, /Optional participant-specific access/);
  assert.match(form, /rolePermissionTemplates\[role\]/);
  assert.match(permissions, /finance_officer:[\s\S]*billing\.view/);
  assert.doesNotMatch(permissions, /finance_officer:[^\n]*notes\.view/);
  assert.match(houses, /service_locations/);
  assert.match(clients, /participant_house_assignments/);
  assert.match(roster, /save_roster_shift_with_staff/);
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
  const [migration, clientRecords, noteRecords] = await Promise.all([
    source("supabase/client-and-note-photos.sql"),
    source("lib/client-records.ts"),
    source("lib/progress-note-records.ts")
  ]);

  assert.match(migration, /profile_photo_path text/);
  assert.match(migration, /photo_evidence jsonb/);
  assert.match(clientRecords, /profile_photo_path/);
  assert.match(noteRecords, /participant-documents|uploadTenantDocumentFile/);
  assert.doesNotMatch(noteRecords, /getPublicUrl|publicURL/);
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
  assert.match(dashboard, /Incident escalations/);
  assert.match(records, /IncidentEscalationPriority/);
});

test("organisation settings require admin role and password step-up verification", async () => {
  const [page, gate] = await Promise.all([
    source("app/admin/settings/page.tsx"),
    source("components/admin/SettingsSecurityGate.tsx")
  ]);
  assert.match(page, /<AdminGate permission="settings">/);
  assert.match(page, /<SettingsSecurityGate>/);
  assert.match(gate, /signInWithPassword/);
  assert.match(gate, /\/api\/auth\/access\?mode=admin/);
  assert.match(gate, /verificationWindowMs = 15 \* 60 \* 1000/);
  assert.match(gate, /window\.sessionStorage/);
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

test("staff dashboard hides management surfaces unless server access is verified", async () => {
  const [dashboard, roleAware, shell] = await Promise.all([
    source("app/dashboard/page.tsx"),
    source("components/dashboard/RoleAwareDashboard.tsx"),
    source("components/AppShell.tsx")
  ]);
  assert.match(dashboard, /<RoleAwareDashboard/);
  assert.doesNotMatch(dashboard, /ManagerDashboardCards|DashboardOperationalLists|StaffProfiles/);
  assert.match(roleAware, /\/api\/auth\/access\?mode=admin/);
  assert.match(roleAware, /\{access \? <ManagerDashboardCards/);
  assert.match(roleAware, /can\("team"\) \? <StaffProfiles/);
  assert.match(roleAware, /can\("shift_verification"\)/);
  assert.match(roleAware, /can\("billing"\)/);
  assert.match(shell, /item\.href !== "\/admin" \|\| verifiedAdmin/);
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
  const [workspace, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("lib/native-billing.ts")
  ]);
  assert.match(workspace, /Billing period from/);
    assert.match(workspace, /NDIS advised rate/);
    assert.match(workspace, /Service agreement rate/);
    assert.match(workspace, /Manual override/);
    assert.match(workspace, /Approve selected code, staffing ratio and calculated rate/);
  assert.match(workspace, /Include in invoice/);
  assert.match(workspace, /createInvoiceFromServices/);
  assert.match(workspace, /Create participant invoice/);
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
  assert.doesNotMatch(workspace.slice(workspace.indexOf('<h2 className="text-xl font-semibold text-ink">4. Invoices'), workspace.indexOf("function StatusPanel")), /line\.description|line\.supportItemName/);
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

test("AI service agreement rates remain editable drafts until explicit approval", async () => {
  const [workspace, route, billing] = await Promise.all([
    source("components/billing/NativeBillingWorkspace.tsx"),
    source("app/api/billing/parse-service-agreement/route.ts"),
    source("lib/native-billing.ts")
  ]);
  assert.match(route, /Never infer a rate/);
  assert.match(route, /reviewStatus: "pending"/);
  assert.match(workspace, /Extract rates for review/);
  assert.match(workspace, /Reviewed and approved/);
    assert.match(workspace, /Approve selected rates/);
    assert.match(workspace, /NDIS catalogue comparison/);
    assert.match(workspace, /findAgreementNdisMatch/);
    assert.match(workspace, /addServiceAgreementItem/);
    assert.match(workspace, /getSuggestedRateDraft/);
  assert.match(workspace, /agreementDraftItems\.filter\(\(item\) => item\.approved\)/);
  assert.match(workspace, /updateAgreementDraftItem/);
  assert.match(billing, /"hour" \| "day" \| "week" \| "month" \| "each" \| "km"/);
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
