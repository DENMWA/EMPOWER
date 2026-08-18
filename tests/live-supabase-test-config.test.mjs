import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPOSABLE_FIXTURE_PURPOSE,
  MUTATION_CONFIRMATION,
  getSupabaseProjectRef,
  loadLiveSecurityTestConfig,
  resolveOrgAAccessToken
} from "../scripts/live-supabase-test-config.mjs";

const orgAId = "11111111-1111-4111-8111-111111111111";
const orgBId = "22222222-2222-4222-8222-222222222222";
const baseConfig = {
  fixturePurpose: DISPOSABLE_FIXTURE_PURPOSE,
  url: "https://testfixture.supabase.co",
  anonKey: "anon-test-key",
  orgAEmail: "org-a@example.test",
  orgAPassword: "not-a-real-password",
  orgAId,
  orgBId,
  participantBId: "33333333-3333-4333-8333-333333333333",
  invoiceBId: "44444444-4444-4444-8444-444444444444",
  documentBId: "55555555-5555-4555-8555-555555555555",
  houseBId: "66666666-6666-4666-8666-666666666666",
  documentBPath: `${orgBId}/33333333-3333-4333-8333-333333333333/report/file.pdf`
};

function enabledEnv(overrides = {}) {
  return {
    RUN_SUPABASE_INTEGRATION_TESTS: "1",
    EMPOWERNOTES_SECURITY_TEST_CONFIRM_PROJECT_REF: "testfixture",
    EMPOWERNOTES_SECURITY_FIXTURES: JSON.stringify(baseConfig),
    ...overrides
  };
}

test("live fixture validation stays inactive during normal tests", () => {
  assert.deepEqual(loadLiveSecurityTestConfig({}), { enabled: false, mutationsEnabled: false, projectRef: null, config: {} });
});

test("mutation mode cannot run without live integration mode", () => {
  assert.throws(() => loadLiveSecurityTestConfig({ RUN_SUPABASE_MUTATION_TESTS: "1" }), /require live integration tests/);
});

test("Supabase project references are derived without exposing keys", () => {
  assert.equal(getSupabaseProjectRef(baseConfig.url), "testfixture");
  assert.equal(getSupabaseProjectRef("http://127.0.0.1:54321"), "local");
  assert.equal(getSupabaseProjectRef("https://example.com"), null);
});

test("enabled live tests fail closed when the confirmed project differs", () => {
  assert.throws(
    () => loadLiveSecurityTestConfig(enabledEnv({ EMPOWERNOTES_SECURITY_TEST_CONFIRM_PROJECT_REF: "anotherproject" })),
    /must exactly equal testfixture/
  );
});

test("read-only live fixture configuration validates disposable tenants", () => {
  const result = loadLiveSecurityTestConfig(enabledEnv());
  assert.equal(result.enabled, true);
  assert.equal(result.mutationsEnabled, false);
  assert.equal(result.projectRef, "testfixture");
});

test("mutation configuration requires a service key and explicit confirmation", () => {
  assert.throws(
    () => loadLiveSecurityTestConfig(enabledEnv({ RUN_SUPABASE_MUTATION_TESTS: "1" })),
    /SUPABASE_SERVICE_ROLE_KEY is required/
  );

  const result = loadLiveSecurityTestConfig(enabledEnv({
    RUN_SUPABASE_MUTATION_TESTS: "1",
    SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
    EMPOWERNOTES_MUTATION_TEST_CONFIRMATION: MUTATION_CONFIRMATION,
    EMPOWERNOTES_SECURITY_FIXTURES: JSON.stringify({
      ...baseConfig,
      orgAMembershipId: "77777777-7777-4777-8777-777777777777",
      testOrganisationNamePrefix: "E2E - "
    })
  }));
  assert.equal(result.mutationsEnabled, true);
});

test("a disposable user can obtain a fresh access token at test time", async () => {
  let requestedUrl = "";
  const token = await resolveOrgAAccessToken(baseConfig, async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => ({ access_token: "fresh-test-token" }) };
  });
  assert.equal(token, "fresh-test-token");
  assert.equal(requestedUrl, `${baseConfig.url}/auth/v1/token?grant_type=password`);
});
