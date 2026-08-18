import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDisposableMutationTargets,
  loadLiveSecurityTestConfig,
  resolveOrgAAccessToken
} from "../scripts/live-supabase-test-config.mjs";

const { enabled, mutationsEnabled, config } = loadLiveSecurityTestConfig();
const accessTokenPromise = enabled ? resolveOrgAAccessToken(config) : Promise.resolve("");

async function userHeaders() {
  return { apikey: config.anonKey, Authorization: `Bearer ${await accessTokenPromise}`, "Content-Type": "application/json" };
}

test("live Supabase RLS denies valid cross-organisation resource identifiers", { skip: !enabled }, async () => {
  const headers = await userHeaders();
  const contextResponse = await fetch(`${config.url}/rest/v1/rpc/current_user_organisation_id`, {
    method: "POST",
    headers,
    body: "{}"
  });
  assert.equal(contextResponse.ok, true);
  assert.equal(await contextResponse.json(), config.orgAId);

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

test("live Supabase rejects switching to an organisation without active membership", { skip: !enabled }, async () => {
  const response = await fetch(`${config.url}/rest/v1/rpc/switch_active_organisation`, {
    method: "POST",
    headers: await userHeaders(),
    body: JSON.stringify({ requested_organisation_id: config.orgBId })
  });
  assert.equal(response.ok, false);
});

test("live Supabase storage refuses another organisation path", { skip: !enabled }, async () => {
  const response = await fetch(`${config.url}/storage/v1/object/sign/participant-documents/${encodeURI(config.documentBPath)}`, {
    method: "POST",
    headers: await userHeaders(),
    body: JSON.stringify({ expiresIn: 60 })
  });
  assert.equal(response.ok, false);
});

async function getMembershipSnapshot(serviceHeaders) {
  await assertDisposableMutationTargets(config);
  const response = await fetch(`${config.url}/rest/v1/organisation_memberships?select=id,organisation_id,role,admin_permissions,feature_permissions,access_status&id=eq.${config.orgAMembershipId}&limit=1`, { headers: serviceHeaders });
  assert.equal(response.ok, true);
  const memberships = await response.json();
  assert.equal(memberships.length, 1);
  assert.equal(memberships[0].organisation_id, config.orgAId);
  assert.equal(memberships[0].access_status, "active");
  return memberships[0];
}

async function restoreMembership(serviceHeaders, snapshot) {
  const response = await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, {
    method: "PATCH",
    headers: serviceHeaders,
    body: JSON.stringify({
      access_status: snapshot.access_status,
      role: snapshot.role,
      admin_permissions: snapshot.admin_permissions || [],
      feature_permissions: snapshot.feature_permissions || []
    })
  });
  assert.equal(response.ok, true);
}

test("live membership suspension denies the next request without changing the profile pointer", { skip: !mutationsEnabled }, async () => {
  const serviceHeaders = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, "Content-Type": "application/json" };
  const authenticatedHeaders = await userHeaders();
  const snapshot = await getMembershipSnapshot(serviceHeaders);
  try {
    const suspend = await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ access_status: "suspended" }) });
    assert.equal(suspend.ok, true);
    const context = await fetch(`${config.url}/rest/v1/rpc/current_user_organisation_id`, { method: "POST", headers: authenticatedHeaders, body: "{}" });
    assert.equal(context.ok, true);
    assert.equal(await context.json(), null);
  } finally {
    await restoreMembership(serviceHeaders, snapshot);
  }
});

test("live membership downgrade removes manager authority on the next request", { skip: !mutationsEnabled }, async () => {
  const serviceHeaders = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, "Content-Type": "application/json" };
  const authenticatedHeaders = await userHeaders();
  const snapshot = await getMembershipSnapshot(serviceHeaders);
  const managerBefore = await fetch(`${config.url}/rest/v1/rpc/current_user_is_manager`, { method: "POST", headers: authenticatedHeaders, body: "{}" });
  assert.equal(managerBefore.ok, true);
  assert.equal(await managerBefore.json(), true);
  try {
    const downgrade = await fetch(`${config.url}/rest/v1/organisation_memberships?id=eq.${config.orgAMembershipId}`, { method: "PATCH", headers: serviceHeaders, body: JSON.stringify({ role: "support_worker", admin_permissions: [], feature_permissions: [] }) });
    assert.equal(downgrade.ok, true);
    const manager = await fetch(`${config.url}/rest/v1/rpc/current_user_is_manager`, { method: "POST", headers: authenticatedHeaders, body: "{}" });
    assert.equal(manager.ok, true);
    assert.equal(await manager.json(), false);
  } finally {
    await restoreMembership(serviceHeaders, snapshot);
  }
});
