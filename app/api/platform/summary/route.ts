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
  platform_access_status?: string | null;
  platform_access_reason?: string | null;
  platform_access_updated_at?: string | null;
};

type PaymentRow = {
  stripe_invoice_id: string;
  organisation_id: string;
  status: string;
  currency: string;
  amount_due_cents: number;
  amount_paid_cents: number;
  attempt_count: number;
  invoice_created_at?: string | null;
  period_end?: string | null;
  paid_at?: string | null;
  failed_at?: string | null;
  hosted_invoice_url?: string | null;
};

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Platform analytics are not configured." }, { status: 503 });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const organisationResponse = await fetch(
    `${url}/rest/v1/organisations?select=id,name,created_at,provider_type,subscription_tier,subscription_status,trial_ends_at,subscription_current_period_end,stripe_customer_id,stripe_subscription_id,platform_access_status,platform_access_reason,platform_access_updated_at&order=created_at.desc&limit=100`,
    { headers, cache: "no-store" }
  );
  if (!organisationResponse.ok) return NextResponse.json({ error: "Organisation analytics could not be loaded." }, { status: 502 });

  const organisationRows = await organisationResponse.json() as OrganisationRow[];
  const paymentResponse = await fetch(
    `${url}/rest/v1/platform_subscription_payments?select=stripe_invoice_id,organisation_id,status,currency,amount_due_cents,amount_paid_cents,attempt_count,invoice_created_at,period_end,paid_at,failed_at,hosted_invoice_url&order=invoice_created_at.desc&limit=1000`,
    { headers, cache: "no-store" }
  );
  const paymentRows = paymentResponse.ok ? await paymentResponse.json() as PaymentRow[] : [];
  const organisationsLimit = 100;
  const paymentsLimit = 1000;
  const counts = await getOrganisationCounts(url, headers, organisationRows.map((row) => row.id));
  const organisations = organisationRows.map((organisation) => {
    const rowCounts = counts.get(organisation.id) || { users: 0, clients: 0, incidents: 0 };
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
      platformAccessStatus: organisation.platform_access_status || "active",
      platformAccessReason: organisation.platform_access_reason || "",
      platformAccessUpdatedAt: organisation.platform_access_updated_at || "",
      users: rowCounts.users,
      clients: rowCounts.clients,
      incidents: rowCounts.incidents
    };
  });

  const payments = buildPaymentAnalytics(paymentRows, organisationRows);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      organisations: organisations.length,
      activeUsers: organisations.reduce((total, item) => total + item.users, 0),
      activeClients: organisations.reduce((total, item) => total + item.clients, 0),
      incidents: organisations.reduce((total, item) => total + item.incidents, 0),
      trialAccounts: organisations.filter((item) => item.status === "trialing").length,
      payingAccounts: organisations.filter((item) => item.billingState === "Paying").length,
      paymentRisk: Math.max(organisations.filter((item) => item.status === "past_due").length, payments.providers.filter((item) => item.risk).length),
      lifetimeRevenueCents: payments.lifetimePaidCents,
      currentMonthRevenueCents: payments.currentMonthPaidCents,
      organisationsTruncated: organisationRows.length >= organisationsLimit,
      paymentsTruncated: paymentRows.length >= paymentsLimit
    },
    organisations,
    payments
  });
}

async function getOrganisationCounts(url: string, headers: Record<string, string>, organisationIds: string[]) {
  const counts = new Map<string, { users: number; clients: number; incidents: number }>();

  // Fast path: a single aggregated query (see supabase/platform-organisation-counts.sql).
  // Falls back to the old per-organisation queries below if that migration
  // has not been run yet, so this keeps working either way.
  try {
    const response = await fetch(`${url}/rest/v1/rpc/platform_organisation_counts`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store"
    });
    if (response.ok) {
      const rows = await response.json() as Array<{ organisation_id: string; users_count: number | string; clients_count: number | string; incidents_count: number | string }>;
      rows.forEach((row) => {
        counts.set(row.organisation_id, {
          users: Number(row.users_count) || 0,
          clients: Number(row.clients_count) || 0,
          incidents: Number(row.incidents_count) || 0
        });
      });
      return counts;
    }
  } catch {
    // fall through to the per-organisation fallback below
  }

  await Promise.all(organisationIds.map(async (organisationId) => {
    const [users, clients, incidents] = await Promise.all([
      countRows(url, headers, "users", organisationId),
      countRows(url, headers, "participants_or_clients", organisationId),
      countRows(url, headers, "incident_reports", organisationId)
    ]);
    counts.set(organisationId, { users, clients, incidents });
  }));
  return counts;
}

function buildPaymentAnalytics(rows: PaymentRow[], organisations: OrganisationRow[]) {
  const organisationNames = new Map(organisations.map((item) => [item.id, item.name]));
  const unresolvedStatuses = new Set(["failed", "open", "uncollectible"]);
  const now = new Date();
  const riskBoundary = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return date.toISOString().slice(0, 7);
  });
  const providers = organisations.map((organisation) => {
    const providerRows = rows.filter((row) => row.organisation_id === organisation.id);
    const unpaid = providerRows.filter((row) => unresolvedStatuses.has(row.status));
    const oldestUnpaid = unpaid.map((row) => row.failed_at || row.period_end || row.invoice_created_at || "").filter(Boolean).sort()[0] || "";
    const overdueDays = oldestUnpaid ? Math.max(0, Math.floor((now.getTime() - new Date(oldestUnpaid).getTime()) / 86400000)) : 0;
    return {
      organisationId: organisation.id,
      organisationName: organisation.name,
      lifetimePaidCents: providerRows.reduce((total, row) => total + (row.status === "paid" ? Number(row.amount_paid_cents) || 0 : 0), 0),
      missedPayments: unpaid.length,
      outstandingCents: unpaid.reduce((total, row) => total + (Number(row.amount_due_cents) || 0), 0),
      oldestUnpaidAt: oldestUnpaid,
      overdueDays,
      risk: Boolean(oldestUnpaid && new Date(oldestUnpaid) <= riskBoundary),
      lastPaidAt: providerRows.filter((row) => row.status === "paid").map((row) => row.paid_at || row.invoice_created_at || "").filter(Boolean).sort().reverse()[0] || ""
    };
  });
  const monthly = monthKeys.map((month) => {
    const paidRows = rows.filter((row) => row.status === "paid" && (row.paid_at || row.invoice_created_at || "").slice(0, 7) === month);
    return {
      month,
      totalPaidCents: paidRows.reduce((total, row) => total + (Number(row.amount_paid_cents) || 0), 0),
      providers: providers.map((provider) => ({
        organisationId: provider.organisationId,
        organisationName: provider.organisationName,
        paidCents: paidRows.filter((row) => row.organisation_id === provider.organisationId).reduce((total, row) => total + (Number(row.amount_paid_cents) || 0), 0)
      })).filter((provider) => provider.paidCents > 0)
    };
  });
  const currentMonth = now.toISOString().slice(0, 7);
  return {
    lifetimePaidCents: rows.reduce((total, row) => total + (row.status === "paid" ? Number(row.amount_paid_cents) || 0 : 0), 0),
    currentMonthPaidCents: monthly.find((item) => item.month === currentMonth)?.totalPaidCents || 0,
    providers,
    monthly,
    ledger: rows.slice(0, 100).map((row) => ({
      invoiceId: row.stripe_invoice_id,
      organisationId: row.organisation_id,
      organisationName: organisationNames.get(row.organisation_id) || "Unknown provider",
      status: row.status,
      amountDueCents: Number(row.amount_due_cents) || 0,
      amountPaidCents: Number(row.amount_paid_cents) || 0,
      attemptCount: Number(row.attempt_count) || 0,
      date: row.paid_at || row.failed_at || row.invoice_created_at || "",
      hostedInvoiceUrl: row.hosted_invoice_url || ""
    }))
  };
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
