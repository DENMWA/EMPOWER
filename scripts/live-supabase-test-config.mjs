import fs from "node:fs";
import path from "node:path";

export const DISPOSABLE_FIXTURE_PURPOSE = "disposable-security-test";
export const MUTATION_CONFIRMATION = "I_UNDERSTAND_THIS_MUTATES_DISPOSABLE_DATA";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const readOnlyRequired = [
  "url",
  "anonKey",
  "orgAId",
  "orgBId",
  "participantBId",
  "invoiceBId",
  "documentBId",
  "houseBId",
  "documentBPath"
];
const idFields = ["orgAId", "orgBId", "participantBId", "invoiceBId", "documentBId", "houseBId"];

function readFixtureJson(env) {
  const inline = env.EMPOWERNOTES_SECURITY_FIXTURES?.trim();
  const fixtureFile = env.EMPOWERNOTES_SECURITY_FIXTURES_FILE?.trim();
  if (inline && fixtureFile) {
    throw new Error("Set either EMPOWERNOTES_SECURITY_FIXTURES or EMPOWERNOTES_SECURITY_FIXTURES_FILE, not both.");
  }

  let raw = inline;
  if (fixtureFile) {
    const resolvedPath = path.resolve(fixtureFile);
    if (!fs.existsSync(resolvedPath)) throw new Error(`Security fixture file was not found: ${resolvedPath}`);
    raw = fs.readFileSync(resolvedPath, "utf8");
  }
  if (!raw) throw new Error("Live tenant tests require EMPOWERNOTES_SECURITY_FIXTURES_FILE or EMPOWERNOTES_SECURITY_FIXTURES.");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("The live tenant security fixture JSON is invalid.");
  }
}

export function getSupabaseProjectRef(value) {
  try {
    const url = new URL(value);
    const supabaseMatch = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (supabaseMatch) return supabaseMatch[1];
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return "local";
    return null;
  } catch {
    return null;
  }
}

export function loadLiveSecurityTestConfig(env = process.env) {
  const enabled = env.RUN_SUPABASE_INTEGRATION_TESTS === "1";
  const mutationsEnabled = env.RUN_SUPABASE_MUTATION_TESTS === "1";
  if (mutationsEnabled && !enabled) throw new Error("Mutation tests require live integration tests to be enabled.");
  if (!enabled) return { enabled: false, mutationsEnabled: false, projectRef: null, config: {} };

  const parsed = readFixtureJson(env);
  const config = {
    ...parsed,
    serviceRoleKey: parsed.serviceRoleKey || env.SUPABASE_SERVICE_ROLE_KEY
  };
  const issues = [];

  if (config.fixturePurpose !== DISPOSABLE_FIXTURE_PURPOSE) {
    issues.push(`fixturePurpose must be ${DISPOSABLE_FIXTURE_PURPOSE}`);
  }
  for (const key of readOnlyRequired) {
    if (!config[key]) issues.push(`${key} is required`);
  }
  if (!config.orgAToken && !(config.orgAEmail && config.orgAPassword)) {
    issues.push("provide orgAToken or both orgAEmail and orgAPassword");
  }
  for (const key of idFields) {
    if (config[key] && !uuidPattern.test(config[key])) issues.push(`${key} must be a UUID`);
  }

  const projectRef = getSupabaseProjectRef(config.url);
  if (!projectRef) issues.push("url must be a Supabase project URL or a local Supabase URL");
  const confirmedProjectRef = env.EMPOWERNOTES_SECURITY_TEST_CONFIRM_PROJECT_REF?.trim();
  if (projectRef && confirmedProjectRef !== projectRef) {
    issues.push(`EMPOWERNOTES_SECURITY_TEST_CONFIRM_PROJECT_REF must exactly equal ${projectRef}`);
  }
  if (config.orgAId && config.orgBId && config.orgAId === config.orgBId) issues.push("Org A and Org B must be different organisations");
  if (config.documentBPath && config.orgBId && !config.documentBPath.startsWith(`${config.orgBId}/`)) {
    issues.push("documentBPath must begin with the Org B ID");
  }

  if (mutationsEnabled) {
    if (!config.serviceRoleKey) issues.push("SUPABASE_SERVICE_ROLE_KEY is required for mutation tests");
    if (!config.orgAMembershipId || !uuidPattern.test(config.orgAMembershipId)) issues.push("orgAMembershipId must be a UUID");
    if (!config.testOrganisationNamePrefix?.trim()) issues.push("testOrganisationNamePrefix is required for mutation tests");
    if (env.EMPOWERNOTES_MUTATION_TEST_CONFIRMATION !== MUTATION_CONFIRMATION) {
      issues.push(`EMPOWERNOTES_MUTATION_TEST_CONFIRMATION must exactly equal ${MUTATION_CONFIRMATION}`);
    }
  }

  if (issues.length) throw new Error(`Live tenant security test configuration failed:\n- ${issues.join("\n- ")}`);
  return { enabled, mutationsEnabled, projectRef, config };
}

export async function resolveOrgAAccessToken(config, fetchImpl = fetch) {
  if (config.orgAToken) return config.orgAToken;
  const response = await fetchImpl(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: config.orgAEmail, password: config.orgAPassword })
  });
  if (!response.ok) throw new Error(`Disposable Org A test-user sign-in failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("Disposable Org A test-user sign-in returned no access token.");
  return payload.access_token;
}

export async function assertDisposableMutationTargets(config, fetchImpl = fetch) {
  const headers = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` };
  const ids = `(${config.orgAId},${config.orgBId})`;
  const response = await fetchImpl(`${config.url}/rest/v1/organisations?select=id,name&id=in.${encodeURIComponent(ids)}`, { headers });
  if (!response.ok) throw new Error(`Could not verify disposable organisations (HTTP ${response.status}).`);
  const organisations = await response.json();
  if (!Array.isArray(organisations) || organisations.length !== 2) throw new Error("Both disposable test organisations must exist.");
  const prefix = config.testOrganisationNamePrefix.trim();
  if (organisations.some((organisation) => !String(organisation.name || "").startsWith(prefix))) {
    throw new Error(`Mutation targets must both have organisation names beginning with ${prefix}.`);
  }
}
