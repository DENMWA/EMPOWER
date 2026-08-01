import { createHmac, timingSafeEqual } from "crypto";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

const stripeApi = "https://api.stripe.com/v1";

export type StripeSubscription = {
  id: string;
  customer: string | { id?: string };
  status: string;
  current_period_end?: number;
  trial_end?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ current_period_end?: number; price?: { id?: string } }> };
};

export function getStripePriceId(tier: SubscriptionTier) {
  return {
    solo: process.env.STRIPE_PRICE_SOLO,
    practice: process.env.STRIPE_PRICE_PRACTICE,
    provider: process.env.STRIPE_PRICE_PROVIDER,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE
  }[tier] || "";
}

export function getTierForStripePrice(priceId: string): SubscriptionTier | null {
  const tiers: SubscriptionTier[] = ["solo", "practice", "provider", "enterprise"];
  return tiers.find((tier) => getStripePriceId(tier) === priceId) || null;
}

export async function stripeRequest<T>(path: string, body?: URLSearchParams, method = "POST") {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey?.startsWith("sk_")) return { data: null as T | null, error: "Stripe is not configured." };

  try {
    const response = await fetch(`${stripeApi}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
      },
      body: body?.toString(),
      cache: "no-store"
    });
    const data = await response.json() as T & { error?: { message?: string } };
    if (!response.ok) return { data: null as T | null, error: data.error?.message || "Stripe rejected the request." };
    return { data, error: "" };
  } catch {
    return { data: null as T | null, error: "Stripe is temporarily unavailable." };
  }
}

export function verifyStripeWebhook(payload: string, signatureHeader: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return false;

  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1] || "";
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    try {
      const received = Buffer.from(signature, "hex");
      return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
    } catch {
      return false;
    }
  });
}

export function stripeCustomerId(customer: StripeSubscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id || "";
}

export function stripePeriodEnd(subscription: StripeSubscription) {
  const itemEnds = subscription.items?.data?.map((item) => item.current_period_end || 0) || [];
  return subscription.current_period_end || Math.max(0, ...itemEnds);
}

export function mapStripeStatus(status: string) {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "paused") return "paused";
  if (status === "canceled") return "cancelled";
  return "suspended";
}

export async function getOrganisationBilling(organisationId: string) {
  const rows = await supabaseServiceRequest<Array<{ id: string; name: string; contact_email: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string | null }>>(
    `organisations?select=id,name,contact_email,stripe_customer_id,stripe_subscription_id,subscription_status&id=eq.${encodeURIComponent(organisationId)}&limit=1`
  );
  return rows.data?.[0] || null;
}

export async function findOrganisationForSubscription(subscription: StripeSubscription) {
  const metadataId = subscription.metadata?.organisation_id;
  if (metadataId) return metadataId;
  const customerId = stripeCustomerId(subscription.customer);
  const query = subscription.id
    ? `stripe_subscription_id=eq.${encodeURIComponent(subscription.id)}`
    : `stripe_customer_id=eq.${encodeURIComponent(customerId)}`;
  const rows = await supabaseServiceRequest<Array<{ id: string }>>(`organisations?select=id&${query}&limit=1`);
  return rows.data?.[0]?.id || "";
}

export async function syncOrganisationSubscription(organisationId: string, subscription: StripeSubscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id || "";
  const tier = getTierForStripePrice(priceId);
  const periodEnd = stripePeriodEnd(subscription);
  return supabaseServiceRequest(`organisations?id=eq.${encodeURIComponent(organisationId)}`, "PATCH", {
    stripe_customer_id: stripeCustomerId(subscription.customer) || null,
    stripe_subscription_id: subscription.id,
    subscription_tier: tier || undefined,
    subscription_status: mapStripeStatus(subscription.status),
    subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  });
}

export async function supabaseServiceRequest<T = unknown>(path: string, method = "GET", body?: unknown) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { data: null as T | null, error: "Supabase billing access is not configured." };
  try {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) as T : null;
    return response.ok ? { data, error: "" } : { data: null as T | null, error: text || response.statusText };
  } catch {
    return { data: null as T | null, error: "Supabase billing access is temporarily unavailable." };
  }
}
