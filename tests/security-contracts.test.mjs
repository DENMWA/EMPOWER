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

test("client writes remain manager and organisation scoped", async () => {
  const policy = await source("supabase/repair-client-rls.sql");
  assert.match(policy, /organisation_id = public\.current_user_organisation_id\(\)/);
  assert.match(policy, /public\.current_user_is_manager\(\)/);
  assert.match(policy, /for insert\s+to authenticated\s+with check/s);
  assert.match(policy, /for update\s+to authenticated\s+using/s);
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
