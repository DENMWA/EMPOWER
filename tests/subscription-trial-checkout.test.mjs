import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = (file) => readFile(path.join(root, file), "utf8");

test("plan checkout starts only after the 14-day free trial", async () => {
  const [checkout, stripe, plan, statusRoute, prompt, shell] = await Promise.all([
    source("app/api/stripe/checkout/route.ts"),
    source("lib/stripe/server.ts"),
    source("components/billing/PlanManagementCard.tsx"),
    source("app/api/subscription/status/route.ts"),
    source("components/subscription/SubscriptionPaymentPrompt.tsx"),
    source("components/AppShell.tsx")
  ]);
  assert.match(stripe, /trial_ends_at/);
  assert.match(checkout, /organisation\.subscription_status === "trialing" && trialEndsAt > Date\.now\(\)/);
  assert.match(checkout, /payment_method_types\[0\]/);
  assert.match(checkout, /payment_method_collection: "always"/);
  assert.match(plan, /Nothing is charged during your free trial/);
  assert.match(plan, /Your workspace and records remain in place/);
  assert.match(plan, /Visa and Mastercard accepted securely through Stripe/);
  assert.match(plan, /disabled=\{Boolean\(busyAction\) \|\| trialActive\}/);
  assert.match(statusRoute, /paymentRequired/);
  assert.match(statusRoute, /Your free trial is complete/);
  assert.match(statusRoute, /canManageBilling/);
  assert.match(prompt, /Proceed to payment/);
  assert.match(prompt, /\/api\/subscription\/status/);
  assert.match(prompt, /!status\.canManageBilling/);
  assert.doesNotMatch(prompt, /Your organisation admin can update payment/);
  assert.match(shell, /<SubscriptionPaymentPrompt signedIn=\{signedIn\} isPlatform=\{isPlatform\} \/>/);
});
