import { NextResponse } from "next/server";
import {
  findOrganisationForSubscription,
  recordSubscriptionInvoice,
  stripeRequest,
  supabaseServiceRequest,
  syncOrganisationSubscription,
  verifyStripeWebhook,
  type StripeInvoice,
  type StripeSubscription
} from "@/lib/stripe/server";
import { recordSubscriptionMarketingConversion } from "@/lib/marketing/server";

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

  let resolvedOrganisationId = "";
  let handled = false;

  try {
    if (event.type === "checkout.session.completed") {
      handled = true;
      const session = event.data?.object || {};
      const subscriptionId = stringId(session.subscription);
      const organisationId = stringValue(session.client_reference_id) || metadataValue(session, "organisation_id");
      if (subscriptionId && organisationId) {
        resolvedOrganisationId = await retrieveAndSync(subscriptionId, organisationId);
      }
    } else if (event.type?.startsWith("customer.subscription.")) {
      handled = true;
      const subscription = event.data?.object as StripeSubscription | undefined;
      if (subscription?.id) {
        const organisationId = await findOrganisationForSubscription(subscription);
        if (organisationId) {
          await ensureSynced(organisationId, subscription);
          resolvedOrganisationId = organisationId;
        }
        if (organisationId && subscription.status === "active") await recordSubscriptionMarketingConversion(organisationId, subscription.id).catch(() => undefined);
      }
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      handled = true;
      const invoice = (event.data?.object || {}) as StripeInvoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      const organisationId = subscriptionId ? await retrieveAndSync(subscriptionId) : "";
      if (organisationId) {
        resolvedOrganisationId = organisationId;
        const ledger = await recordSubscriptionInvoice(organisationId, invoice, event.id || "", event.type);
        if (ledger.error) throw new Error(ledger.error);
        if ((event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") && subscriptionId) await recordSubscriptionMarketingConversion(organisationId, subscriptionId).catch(() => undefined);
      }
    }
  } catch (error) {
    await logWebhookEvent(event, resolvedOrganisationId, "error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Subscription synchronization failed." }, { status: 500 });
  }

  await logWebhookEvent(event, resolvedOrganisationId, handled ? "processed" : "ignored");
  return NextResponse.json({ received: true, eventId: event.id || null });
}

async function logWebhookEvent(event: StripeEvent, organisationId: string, outcome: "processed" | "ignored" | "error", errorDetail = "") {
  if (!event.id) return;
  await supabaseServiceRequest(
    "stripe_webhook_events?on_conflict=stripe_event_id",
    "POST",
    {
      stripe_event_id: event.id,
      event_type: event.type || "unknown",
      organisation_id: organisationId || null,
      outcome,
      error_detail: errorDetail || null,
      received_at: new Date().toISOString()
    },
    "resolution=merge-duplicates,return=minimal"
  ).catch(() => undefined);
}

async function retrieveAndSync(subscriptionId: string, knownOrganisationId = "") {
  const result = await stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`, undefined, "GET");
  if (!result.data) throw new Error(result.error || "Subscription could not be retrieved.");
  const organisationId = knownOrganisationId || await findOrganisationForSubscription(result.data);
  if (!organisationId) throw new Error("Subscription organisation could not be resolved.");
  await ensureSynced(organisationId, result.data);
  return organisationId;
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
