import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrganisationRow = {
  id: string;
  name: string;
  created_at?: string | null;
  provider_type?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  subscription_current_period_end?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Platform analytics are not configured." }, { status: 503 });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const organisationResponse = await fetch(
    `${url}/rest/v1/organisations?select=id,name,created_at,provider_type,subscription_tier,subscription_status,trial_ends_at,subscription_current_period_end,stripe_customer_id,stripe_subscription_id&order=created_at.desc&limit=100`,
    { headers, cache: "no-store" }
  );
  if (!organisationResponse.ok) return NextResponse.json({ error: "Organisation analytics could not be loaded." }, { status: 502 });

  const organisationRows = await organisationResponse.json() as OrganisationRow[];
  const organisations = await Promise.all(organisationRows.map(async (organisation) => {
    const [users, clients, incidents] = await Promise.all([
      countRows(url, headers, "users", organisation.id),
      countRows(url, headers, "participants_or_clients", organisation.id),
      countRows(url, headers, "incident_reports", organisation.id)
    ]);
    const status = normaliseSubscriptionStatus(organisation.subscription_status);
    return {
      id: organisation.id,
      name: organisation.name,
      signedUpAt: organisation.created_at || "",
      providerType: organisation.provider_type || "organisation",
      tier: organisation.subscription_tier || "solo",
      status,
      billingState: getBillingState(status, Boolean(organisation.stripe_subscription_id)),
      trialEndsAt: organisation.trial_ends_at || "",
      currentPeriodEnd: organisation.subscription_current_period_end || "",
      hasStripeCustomer: Boolean(organisation.stripe_customer_id),
      hasStripeSubscription: Boolean(organisation.stripe_subscription_id),
      users,
      clients,
      incidents
    };
  }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      organisations: organisations.length,
      activeUsers: organisations.reduce((total, item) => total + item.users, 0),
      activeClients: organisations.reduce((total, item) => total + item.clients, 0),
      incidents: organisations.reduce((total, item) => total + item.incidents, 0),
      trialAccounts: organisations.filter((item) => item.status === "trialing").length,
      payingAccounts: organisations.filter((item) => item.billingState === "Paying").length,
      paymentRisk: organisations.filter((item) => item.status === "past_due").length
    },
    organisations
  });
}

function normaliseSubscriptionStatus(status?: string | null) {
  return (status || "trialing").trim().toLowerCase();
}

function getBillingState(status: string, hasStripeSubscription: boolean) {
  if (status === "trialing") return "Free trial";
  if (status === "past_due" || status === "unpaid") return "Payment issue";
  if (status === "active" && hasStripeSubscription) return "Paying";
  if (status === "active") return "Active (manual)";
  return "Inactive";
}

async function countRows(url: string, headers: Record<string, string>, table: string, organisationId: string) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&organisation_id=eq.${encodeURIComponent(organisationId)}&limit=1`, {
    method: "GET",
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
    cache: "no-store"
  });
  if (!response.ok) return 0;
  const contentRange = response.headers.get("content-range") || "";
  const total = Number(contentRange.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}
