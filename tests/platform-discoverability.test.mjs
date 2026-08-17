import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = (file) => readFile(path.join(root, file), "utf8");

test("platform discoverability remains owner-only and separates verified signals", async () => {
  const [api, panel, dashboard] = await Promise.all([
    source("app/api/platform/discoverability/route.ts"),
    source("components/platform/DiscoverabilityPanel.tsx"),
    source("components/platform/PlatformDashboard.tsx")
  ]);
  assert.match(api, /verifyServerAccess\(request, "platform"\)/);
  assert.match(api, /GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN/);
  assert.match(api, /platform_discoverability_citations/);
  assert.match(api, /platform_ai_crawler_events/);
  assert.match(api, /checkPublicResources/);
  assert.doesNotMatch(api, /participants_or_clients|progress_notes|incident_reports|documents\?/);
  assert.match(panel, /AI coverage is based on recorded citation checks, not an estimate of total AI impressions/);
  assert.match(panel, /Verified Search Console/);
  assert.match(panel, /Citation ledger/);
  assert.match(dashboard, /id: "discoverability"/);
  assert.match(dashboard, /DiscoverabilityPanel/);
});

test("discoverability storage is private platform metadata with RLS enabled", async () => {
  const [sql, docs] = await Promise.all([
    source("supabase/platform-discoverability-intelligence.sql"),
    source("docs/PLATFORM_DISCOVERABILITY.md")
  ]);
  for (const table of ["platform_discoverability_citations", "platform_ai_crawler_events", "platform_search_daily_metrics"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
  }
  assert.match(docs, /never reads tenant workspaces or participant data/);
  assert.match(docs, /not presented as total AI impressions/);
  assert.match(docs, /Do not put OAuth secrets in `NEXT_PUBLIC_\*` variables/);
});
