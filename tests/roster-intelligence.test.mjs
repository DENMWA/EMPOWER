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
  assert.match(panel, /Print availability form/);
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
