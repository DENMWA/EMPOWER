import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import { getOrganisationBilling, getStripePriceId, stripeRequest } from "@/lib/stripe/server";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

const tiers = new Set<SubscriptionTier>(["solo", "practice", "provider"]);

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "billing");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const input = await request.json().catch(() => ({})) as { tier?: SubscriptionTier };
  if (!input.tier || !tiers.has(input.tier)) return NextResponse.json({ error: "Choose a self-service EmpowerNotes plan. Enterprise subscriptions are arranged with the sales team." }, { status: 400 });
  const priceId = getStripePriceId(input.tier);
  if (!priceId.startsWith("price_")) return NextResponse.json({ error: "This plan has not been connected to Stripe." }, { status: 503 });

  const organisation = await getOrganisationBilling(access.organisationId);
  if (!organisation) return NextResponse.json({ error: "The organisation billing profile could not be loaded." }, { status: 503 });
  if (organisation.stripe_subscription_id && ["active", "trialing", "past_due"].includes(organisation.subscription_status || "")) {
    return NextResponse.json({ error: "This organisation already has a subscription. Use Manage billing to change its plan." }, { status: 409 });
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/admin/billing?checkout=success`,
    cancel_url: `${appUrl}/admin/billing?checkout=cancelled`,
    client_reference_id: access.organisationId,
    "metadata[organisation_id]": access.organisationId,
    "metadata[tier]": input.tier,
    "subscription_data[metadata][organisation_id]": access.organisationId,
    "subscription_data[metadata][tier]": input.tier,
    allow_promotion_codes: "true",
    billing_address_collection: "required",
    "tax_id_collection[enabled]": "true"
  });
  if (organisation.stripe_customer_id) {
    body.set("customer", organisation.stripe_customer_id);
    body.set("customer_update[address]", "auto");
    body.set("customer_update[name]", "auto");
  }
  else if (access.email || organisation.contact_email) body.set("customer_email", access.email || organisation.contact_email || "");

  const result = await stripeRequest<{ url?: string }>("/checkout/sessions", body);
  if (!result.data?.url) return NextResponse.json({ error: result.error || "Stripe did not return a checkout link." }, { status: 502 });
  return NextResponse.json({ url: result.data.url });
}
