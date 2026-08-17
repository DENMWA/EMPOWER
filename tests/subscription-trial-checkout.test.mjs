import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = (file) => readFile(path.join(root, file), "utf8");

test("plan checkout starts only after the 14-day free trial", async () => {
  const [checkout, stripe, plan] = await Promise.all([
    source("app/api/stripe/checkout/route.ts"),
    source("lib/stripe/server.ts"),
    source("components/billing/PlanManagementCard.tsx")
  ]);
  assert.match(stripe, /trial_ends_at/);
  assert.match(checkout, /organisation\.subscription_status === "trialing" && trialEndsAt > Date\.now\(\)/);
  assert.match(checkout, /payment_method_types\[0\]/);
  assert.match(checkout, /payment_method_collection: "always"/);
  assert.match(plan, /Nothing is charged during your free trial/);
  assert.match(plan, /Your workspace and records remain in place/);
  assert.match(plan, /Visa and Mastercard accepted securely through Stripe/);
  assert.match(plan, /disabled=\{Boolean\(busyAction\) \|\| trialActive\}/);
});
