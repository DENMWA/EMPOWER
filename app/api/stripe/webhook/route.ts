import { NextResponse } from "next/server";
import {
  findOrganisationForSubscription,
  stripeRequest,
  syncOrganisationSubscription,
  verifyStripeWebhook,
  type StripeSubscription
} from "@/lib/stripe/server";

export const runtime = "nodejs";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  if (!verifyStripeWebhook(payload, signature)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe payload." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const subscriptionId = stringId(session.subscription);
      const organisationId = stringValue(session.client_reference_id) || metadataValue(session, "organisation_id");
      if (subscriptionId && organisationId) await retrieveAndSync(subscriptionId, organisationId);
    } else if (event.type?.startsWith("customer.subscription.")) {
      const subscription = event.data?.object as StripeSubscription | undefined;
      if (subscription?.id) {
        const organisationId = await findOrganisationForSubscription(subscription);
        if (organisationId) await ensureSynced(organisationId, subscription);
      }
    } else if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      const invoice = event.data?.object || {};
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (subscriptionId) await retrieveAndSync(subscriptionId);
    }
  } catch {
    return NextResponse.json({ error: "Subscription synchronization failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true, eventId: event.id || null });
}

async function retrieveAndSync(subscriptionId: string, knownOrganisationId = "") {
  const result = await stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`, undefined, "GET");
  if (!result.data) throw new Error(result.error || "Subscription could not be retrieved.");
  const organisationId = knownOrganisationId || await findOrganisationForSubscription(result.data);
  if (!organisationId) throw new Error("Subscription organisation could not be resolved.");
  await ensureSynced(organisationId, result.data);
}

async function ensureSynced(organisationId: string, subscription: StripeSubscription) {
  const result = await syncOrganisationSubscription(organisationId, subscription);
  if (result.error) throw new Error(result.error);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return "";
}

function metadataValue(object: Record<string, unknown>, key: string) {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object" && key in metadata
    ? stringValue((metadata as Record<string, unknown>)[key])
    : "";
}

function invoiceSubscriptionId(invoice: Record<string, unknown>) {
  const direct = stringId(invoice.subscription);
  if (direct) return direct;
  const parent = invoice.parent;
  if (!parent || typeof parent !== "object") return "";
  const subscriptionDetails = (parent as Record<string, unknown>).subscription_details;
  return subscriptionDetails && typeof subscriptionDetails === "object"
    ? stringId((subscriptionDetails as Record<string, unknown>).subscription)
    : "";
}
