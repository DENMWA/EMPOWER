import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Organisation = { id: string; subscription_tier?: string; subscription_status?: string; platform_access_status?: string };
type Usage = { active_users?: number; active_participants?: number; active_houses?: number; ai_analysed_notes?: number; documents_uploaded?: number; invoice_lines?: number; storage_bytes?: number };
type Payment = { amount_paid_cents?: number; amount_due_cents?: number; status?: string };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorised metrics request." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Metrics storage is not configured." }, { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const organisations = await read<Organisation[]>(url, headers, "organisations?select=id,subscription_tier,subscription_status,platform_access_status&order=created_at.asc");
  if (!organisations) return NextResponse.json({ error: "Organisations could not be loaded." }, { status: 502 });
  const snapshotDate = new Date().toISOString().slice(0, 10);

  const snapshots = await Promise.all(organisations.map(async (organisation) => {
    const [users, clients, houses, incidents, usageRows, payments] = await Promise.all([
      count(url, headers, "users", organisation.id, "access_status=eq.active"),
      count(url, headers, "participants_or_clients", organisation.id, "status=eq.active"),
      count(url, headers, "service_locations", organisation.id, "status=eq.active"),
      count(url, headers, "incident_reports", organisation.id),
      read<Usage[]>(url, headers, `organisation_usage?select=active_users,active_participants,active_houses,ai_analysed_notes,documents_uploaded,invoice_lines,storage_bytes&organisation_id=eq.${organisation.id}&order=usage_period_end.desc&limit=1`),
      read<Payment[]>(url, headers, `platform_subscription_payments?select=amount_paid_cents,amount_due_cents,status&organisation_id=eq.${organisation.id}`)
    ]);
    const usage = usageRows?.[0] || {};
    const paid = (payments || []).filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount_paid_cents || 0), 0);
    const outstanding = (payments || []).filter((row) => row.status !== "paid").reduce((sum, row) => sum + Math.max(0, Number(row.amount_due_cents || 0) - Number(row.amount_paid_cents || 0)), 0);
    return { snapshot_date: snapshotDate, organisation_id: organisation.id, subscription_tier: organisation.subscription_tier || "solo", subscription_status: organisation.subscription_status || "trialing", platform_access_status: organisation.platform_access_status || "active", users_count: users ?? usage.active_users ?? 0, clients_count: clients ?? usage.active_participants ?? 0, houses_count: houses ?? usage.active_houses ?? 0, incidents_count: incidents || 0, ai_notes_count: usage.ai_analysed_notes || 0, documents_count: usage.documents_uploaded || 0, invoice_lines_count: usage.invoice_lines || 0, storage_bytes: usage.storage_bytes || 0, collected_revenue_cents: paid, outstanding_revenue_cents: outstanding, captured_at: new Date().toISOString() };
  }));

  const response = await fetch(`${url}/rest/v1/platform_metric_snapshots?on_conflict=snapshot_date,organisation_id`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(snapshots), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: `Metrics snapshot returned HTTP ${response.status}. Run platform-metric-snapshots.sql first.` }, { status: 502 });
  return NextResponse.json({ ok: true, snapshotDate, organisations: snapshots.length });
}

async function read<T>(url: string, headers: Record<string, string>, path: string): Promise<T | null> { const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" }); return response.ok ? await response.json() as T : null; }
async function count(url: string, headers: Record<string, string>, table: string, organisationId: string, extraFilter = "") { const response = await fetch(`${url}/rest/v1/${table}?select=id&organisation_id=eq.${organisationId}${extraFilter ? `&${extraFilter}` : ""}&limit=1`, { headers: { ...headers, Prefer: "count=exact" }, cache: "no-store" }); if (!response.ok) return null; const range = response.headers.get("content-range") || ""; const total = Number(range.split("/")[1]); return Number.isFinite(total) ? total : 0; }
