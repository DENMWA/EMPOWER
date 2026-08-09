import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("privileged server access verifies the Supabase user and stored organisation role", async () => {
  const access = await source("lib/security/server-access.ts");
  assert.match(access, /\/auth\/v1\/user/);
  assert.match(access, /users\?select=role,organisation_id/);
  assert.match(access, /adminRoles\.has\(profile\.role\)/);
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

test("staff writes use the verified server tenant rather than browser supplied organisation data", async () => {
  const [route, client] = await Promise.all([
    source("app/api/team/staff/route.ts"),
    source("lib/staff-records.ts")
  ]);
  assert.match(route, /verifyServerAccess\(request, "admin"\)/);
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
  assert.match(generator, /saveRelatedRecord=.*saveTenantProgressNote/s);
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
