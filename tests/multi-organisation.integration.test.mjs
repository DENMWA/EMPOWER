import assert from "node:assert/strict";
import test from "node:test";

const enabled = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "1";
const config = enabled ? JSON.parse(process.env.EMPOWERNOTES_SECURITY_FIXTURES || "{}") : {};
const required = ["url", "anonKey", "orgAToken", "orgBId", "participantBId", "invoiceBId", "documentBId", "houseBId"];
const ready = enabled && required.every((key) => config[key]);

test("live Supabase RLS denies valid cross-organisation resource identifiers", { skip: !ready }, async () => {
  const headers = { apikey: config.anonKey, Authorization: `Bearer ${config.orgAToken}` };
  for (const [table, id] of [
    ["participants_or_clients", config.participantBId],
    ["native_invoices", config.invoiceBId],
    ["documents", config.documentBId]
  ]) {
    const response = await fetch(`${config.url}/rest/v1/${table}?select=id&id=eq.${encodeURIComponent(id)}`, { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  }
  const houseResponse = await fetch(`${config.url}/rest/v1/service_locations?select=id&id=eq.${encodeURIComponent(config.houseBId)}`, { headers });
  assert.equal(houseResponse.status, 200);
  assert.deepEqual(await houseResponse.json(), []);
});

test("live Supabase rejects switching to an organisation without active membership", { skip: !ready }, async () => {
  const response = await fetch(`${config.url}/rest/v1/rpc/switch_active_organisation`, {
    method: "POST",
    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.orgAToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requested_organisation_id: config.orgBId })
  });
  assert.equal(response.ok, false);
});

test("live Supabase storage refuses another organisation path", { skip: !ready || !config.documentBPath }, async () => {
  const response = await fetch(`${config.url}/storage/v1/object/sign/participant-documents/${encodeURI(config.documentBPath)}`, {
    method: "POST",
    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.orgAToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 })
  });
  assert.equal(response.ok, false);
});

const mutationReady = ready && process.env.RUN_SUPABASE_MUTATION_TESTS === "1" && config.serviceRoleKey && config.orgAMembershipId
  && config.orgAOriginalRole && Array.isArray(config.orgAOriginalAdminPermissions) && Array.isArray(config.orgAOriginalFeaturePermissions);

test("live membership suspension denies the next request without changing the profile pointer", { skip: !mutationReady }, async () => {
  const serviceHeaders = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, "Content-Type": "application/json" };
  const userHeaders = { apikey: config.anonKey, Authorization: `Bearer ${config.orgAToken}`, "Content-Type": "application/json" };
  try {
    const suspend = await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ access_status: "suspended" }) });
    assert.equal(suspend.ok, true);
    const context = await fetch(`${config.url}/rest/v1/rpc/current_user_organisation_id`, { method: "POST", headers: userHeaders, body: "{}" });
    assert.equal(context.ok, true);
    assert.equal(await context.json(), null);
  } finally {
    await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ access_status: "active" }) });
  }
});

test("live membership downgrade removes manager authority on the next request", { skip: !mutationReady }, async () => {
  const serviceHeaders = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, "Content-Type": "application/json" };
  const userHeaders = { apikey: config.anonKey, Authorization: `Bearer ${config.orgAToken}`, "Content-Type": "application/json" };
  try {
    await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ role: "support_worker", admin_permissions: [], feature_permissions: [] }) });
    const manager = await fetch(`${config.url}/rest/v1/rpc/current_user_is_manager`, { method: "POST", headers: userHeaders, body: "{}" });
    assert.equal(manager.ok, true);
    assert.equal(await manager.json(), false);
  } finally {
    await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ role: config.orgAOriginalRole, admin_permissions: config.orgAOriginalAdminPermissions, feature_permissions: config.orgAOriginalFeaturePermissions }) });
  }
});
