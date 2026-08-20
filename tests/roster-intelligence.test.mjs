import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const source = (file) => readFile(path.join(process.cwd(), file), "utf8");

test("roster recommendations remain deterministic, explainable and manager controlled", async () => {
  const [engine, panel] = await Promise.all([source("lib/roster-intelligence.ts"), source("components/roster/RosterIntelligencePanel.tsx")]);
  assert.match(engine, /recommendStaffForShift/);
  assert.match(engine, /Overlaps another rostered shift/);
  assert.match(engine, /Availability must be confirmed/);
  assert.doesNotMatch(engine, /OPENAI|fetch\(|generateText|chat\/completions/i);
  assert.match(panel, /Recommendations are advisory/);
  assert.match(panel, /AvailabilityDocumentWorkflow/);
});

test("employee availability PDFs are tenant protected, AI reviewed and manager published", async () => {
  const [pdfRoute, parser, workflow, pdf] = await Promise.all([
    source("app/api/roster/availability-form/route.ts"),
    source("app/api/roster/availability-parse/route.ts"),
    source("components/roster/AvailabilityDocumentWorkflow.tsx"),
    source("lib/availability-form-pdf.ts")
  ]);
  assert.match(pdfRoute, /verifyServerAccess\(request, "admin", "scheduling", "rostering.manage"\)/);
  assert.match(pdfRoute, /organisation_id=eq\.\$\{access\.organisationId\}/);
  assert.match(pdfRoute, /templateType/);
  assert.match(pdfRoute, /blankTemplate/);
  assert.match(pdf, /Employee availability form/);
  assert.match(pdf, /application\/pdf|%PDF-1\.4/);
  assert.match(parser, /permission: "rostering.manage"/);
  assert.match(parser, /Do not infer missing times or availability/);
  assert.match(workflow, /AI extraction has been reviewed/);
  assert.match(workflow, /Publish availability/);
  assert.match(workflow, /Blank template/);
  assert.match(workflow, /Staff template/);
  assert.match(workflow, /refreshSupabaseSession\(\{ force: true \}\)/);
  assert.match(workflow, /Please sign in again, then upload the availability form/);
  assert.match(workflow, /readUploadError/);
  assert.match(workflow, /saveStaffAvailability/);
});

test("roster service locations are optional, tenant scoped and filterable", async () => {
  const [modal, cloud, filters, sql, roster, rest, card, week, planning, page] = await Promise.all([
    source("components/roster/CreateRosterShiftModal.tsx"),
    source("lib/roster-cloud.ts"),
    source("components/roster/RosterFilters.tsx"),
    source("supabase/optional-roster-service-locations.sql"),
    source("lib/roster.ts"),
    source("lib/supabase-rest.ts"),
    source("components/roster/RosterShiftCard.tsx"),
    source("components/roster/RosterWeekView.tsx"),
    source("components/roster/RosterPlanningOverview.tsx"),
    source("components/roster/RosterPage.tsx")
  ]);
  assert.match(modal, /Client home/);
  assert.match(modal, /Community/);
  assert.match(modal, /Appointment location/);
  assert.match(modal, /Respite setting/);
  assert.match(modal, /Other location/);
  assert.match(modal, /Shift particulars and instructions/);
  assert.match(modal, /Add to roster/);
  assert.match(modal, /getTenantHouses/);
  assert.match(cloud, /save_roster_shift_with_service_location/);
  assert.match(cloud, /savedToCloud: !result\.error/);
  assert.match(filters, /Client home \/ community/);
  assert.match(sql, /service_location_id text/);
  assert.match(sql, /roster_service_location_id text default null/);
  assert.match(sql, /organisation_id = actor_organisation_id/);
  assert.match(sql, /references public\.service_locations\(organisation_id, id\)/);
  assert.match(roster, /rosterUpdatedEvent/);
  assert.match(roster, /window\.dispatchEvent\(new Event\(rosterUpdatedEvent\)\)/);
  assert.match(rest, /response\.status === 204/);
  assert.match(rest, /responseText \? JSON\.parse\(responseText\)/);
  assert.match(roster, /getRosterCoverageColour/);
  assert.match(roster, /markRosterShiftVacant/);
  assert.match(roster, /markRosterShiftCancelled/);
  assert.match(cloud, /filter\(\(worker\) => worker\.id\)/);
  assert.match(card, /Assigned shift|colour\.label|getRosterCoverageColour/);
  assert.match(week, /getRosterCoverageColour/);
  assert.match(week, /Staff \/ coverage/);
  assert.match(week, /getRosterFortnightDays/);
  assert.match(week, /repeat\(14,minmax\(120px,1fr\)\)/);
  assert.match(week, /rows\.set\("unassigned"/);
  assert.match(week, /Unassigned \/ vacant/);
  assert.match(week, /\+ Add shift/);
  assert.match(week, /onCreateShift/);
  assert.match(planning, /RosterPlanningOverview/);
  assert.match(planning, /month"\s*\|\s*"quarter"\s*\|\s*"year"/);
  assert.match(planning, /getPlanningBuckets/);
  assert.match(page, /replacementShiftId/);
  assert.match(page, /shiftPrefill/);
  assert.match(page, /planningOffsetWeeks/);
  assert.match(page, /Roster sheet navigator/);
  assert.match(page, /Move calendar roster by week/);
  assert.match(page, /max="52"/);
  assert.match(page, /fortnight/);
  assert.match(page, /quarter/);
  assert.match(page, /year/);
  assert.match(page, /getTenantStaffInvites/);
  assert.match(page, /Roster coverage colours/);
  assert.match(page, /keepRosterSheetOpenAfterSave/);
  assert.match(page, /rosterSheetShifts/);
  assert.match(page, /shifts=\{rosterSheetShifts\}/);
  assert.match(page, /downloadRoster/);
  assert.match(page, /Download roster/);
  assert.match(page, /empowernotes-roster-\$\{view\}/);
  assert.doesNotMatch(page, /setView\("day"\)/);
});

test("vacant roster shifts are supported by the database save function", async () => {
  const sql = await source("supabase/roster-vacant-shifts.sql");
  assert.match(sql, /save_roster_shift_with_staff/);
  assert.match(sql, /Roster assignments must be an array/);
  assert.doesNotMatch(sql, /Assign at least one staff member/);
  assert.match(sql, /jsonb_array_elements\(coalesce\(roster_assignments, '\[\]'::jsonb\)\)/);
});

test("replacement offers are expiring, single-use and omit client information", async () => {
  const [send, respond, sql] = await Promise.all([
    source("app/api/roster/replacement-offers/route.ts"),
    source("app/api/roster/replacement-offers/respond/route.ts"),
    source("supabase/roster-intelligence.sql")
  ]);
  assert.match(send, /randomBytes\(32\)/);
  assert.match(send, /10 \* 60 \* 1000/);
  assert.match(send, /No client or clinical information/);
  assert.doesNotMatch(send, /participantName|diagnos|progress.note/i);
  assert.match(respond, /status=eq\.pending/);
  assert.match(respond, /now conflicts with another assignment/);
  assert.match(respond, /export async function POST/);
  assert.match(respond, /The roster will not change until you submit/);
  assert.doesNotMatch(send, /answer=yes|answer=no/);
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /current_user_organisation_id/);
});

test("availability writes derive tenant authority in the database", async () => {
  const [cloud, sql] = await Promise.all([source("lib/roster-intelligence-cloud.ts"), source("supabase/roster-intelligence.sql")]);
  assert.match(cloud, /supabaseRpc<string>\("save_staff_availability"/);
  assert.match(sql, /tenant_id uuid := public\.current_user_organisation_id\(\)/);
  assert.match(sql, /public\.current_user_is_manager\(\)/);
  assert.doesNotMatch(cloud, /organisation_id/);
});

test("weekly availability map is calendar-synchronised, accessible and responsive", async () => {
  const [map, panel, page] = await Promise.all([
    source("components/roster/StaffAvailabilityMap.tsx"),
    source("components/roster/RosterIntelligencePanel.tsx"),
    source("components/roster/RosterPage.tsx")
  ]);
  assert.match(map, /Weekly coverage map/);
  assert.match(map, /Preferred/);
  assert.match(map, /Available/);
  assert.match(map, /Rostered/);
  assert.match(map, /Unavailable/);
  assert.match(map, /Not submitted/);
  assert.match(map, /aria-pressed=\{active\}/);
  assert.match(map, /overflow-x-auto/);
  assert.match(map, /mode === "staff"/);
  assert.match(map, /mode === "coverage"/);
  assert.match(map, /mode === "gaps"/);
  assert.match(panel, /selectedDate=\{selectedDate\}/);
  assert.match(page, /RosterIntelligencePanel shifts=\{shifts\} selectedDate=\{selectedDate\}/);
});

test("invited workers receive a private week, fortnight and month roster", async () => {
  const [page, api, shell, redirect, policy] = await Promise.all([
    source("components/roster/MyRosterPage.tsx"),
    source("app/api/roster/me/route.ts"),
    source("components/AppShell.tsx"),
    source("app/roster/page.tsx"),
    source("supabase/worker-personal-roster.sql")
  ]);
  assert.match(page, /My Roster/);
  assert.match(page, /"week"/);
  assert.match(page, /"fortnight"/);
  assert.match(page, /"month"/);
  assert.match(page, /Scheduled hours/);
  assert.match(page, /Calendar/);
  assert.match(page, /List/);
  assert.match(shell, /href: "\/my-roster", label: "My Roster"/);
  assert.match(redirect, /redirect\("\/my-roster"\)/);
  assert.match(api, /resolveUserAccessContext\(request\)/);
  assert.match(api, /context\.userId/);
  assert.match(api, /context\.email/);
  assert.doesNotMatch(api, /params\.get\("staff|params\.get\("worker/i);
  assert.match(policy, /staff_user_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /link_shift_assignment_to_auth_user/);
  assert.match(policy, /invitation\.auth_user_id/);
  assert.doesNotMatch(policy, /auth\.jwt\(\) ->> 'email'/);
  assert.match(policy, /managers view organisation shifts workers view assigned shifts/);
  assert.doesNotMatch(policy, /assigned_to_participant/);
});
