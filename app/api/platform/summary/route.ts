import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrganisationRow = {
  id: string;
  name: string;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  subscription_current_period_end?: string | null;
};

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Platform analytics are not configured." }, { status: 503 });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const organisationResponse = await fetch(
    `${url}/rest/v1/organisations?select=id,name,subscription_tier,subscription_status,trial_ends_at,subscription_current_period_end&order=created_at.desc&limit=100`,
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
    return {
      id: organisation.id,
      name: organisation.name,
      tier: organisation.subscription_tier || "solo",
      status: organisation.subscription_status || "trialing",
      renewal: organisation.subscription_current_period_end || organisation.trial_ends_at || "",
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
      paymentRisk: organisations.filter((item) => item.status === "past_due").length
    },
    organisations
  });
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
