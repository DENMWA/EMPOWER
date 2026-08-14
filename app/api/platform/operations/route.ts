import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccessStatus = "active" | "payment_risk" | "suspended" | "locked_review" | "cancelled";
const accessStatuses = new Set<AccessStatus>(["active", "payment_risk", "suspended", "locked_review", "cancelled"]);

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const db = database();
  if (!db) return NextResponse.json({ error: "Platform operations storage is not configured." }, { status: 503 });

  const [security, support, usage, observations, audits] = await Promise.all([
    read(db, "platform_security_events?select=id,organisation_id,event_type,severity,summary,endpoint,occurred_at&order=occurred_at.desc&limit=100"),
    read(db, "platform_support_cases?select=id,organisation_id,title,category,severity,status,page_path,browser,deployment_id,created_at,updated_at,resolved_at&order=created_at.desc&limit=100"),
    read(db, "organisation_usage?select=organisation_id,usage_period_start,usage_period_end,active_participants,active_users,active_houses,documents_uploaded,ai_analysed_notes,invoice_lines,storage_bytes&order=usage_period_end.desc&limit=500"),
    read(db, "entitlement_observations?select=organisation_id,resource,action_name,would_block,observed_at&order=observed_at.desc&limit=1000"),
    read(db, "audit_logs?select=organisation_id,actor_id,action,entity_type,created_at&order=created_at.desc&limit=100")
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    securityEvents: security.rows,
    supportCases: support.rows,
    usage: usage.rows,
    observations: observations.rows,
    auditEvents: audits.rows,
    availability: {
      security: security.ok,
      support: support.ok,
      usage: usage.ok,
      observations: observations.ok,
      audit: audits.ok
    }
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const db = database();
  if (!db) return NextResponse.json({ error: "Platform operations storage is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { action?: string; organisationId?: string; status?: AccessStatus; reason?: string; supportCaseId?: string; supportStatus?: string; resolutionNotes?: string };

  if (body.action === "set_access") {
    const organisationId = body.organisationId?.trim() || "";
    const status = body.status;
    const reason = body.reason?.trim() || "";
    if (!organisationId || !status || !accessStatuses.has(status)) return NextResponse.json({ error: "Choose an organisation and valid access status." }, { status: 400 });
    if (status !== "active" && reason.length < 8) return NextResponse.json({ error: "Add a clear reason of at least 8 characters." }, { status: 400 });

    const updatedAt = new Date().toISOString();
    const update = await fetch(`${db.url}/rest/v1/organisations?id=eq.${encodeURIComponent(organisationId)}`, {
      method: "PATCH",
      headers: { ...db.headers, Prefer: "return=representation" },
      body: JSON.stringify({ platform_access_status: status, platform_access_reason: status === "active" ? null : reason, platform_access_updated_at: updatedAt, platform_access_updated_by: access.userId }),
      cache: "no-store"
    });
    const rows = update.ok ? await update.json() as Array<{ id: string }> : [];
    if (!update.ok || !rows.length) return NextResponse.json({ error: "Organisation access could not be updated. Run platform-operations-console.sql first." }, { status: 502 });
    await writeEvent(db, { organisation_id: organisationId, actor_user_id: access.userId, event_type: "organisation_access_changed", severity: status === "active" ? "info" : "warning", summary: `Organisation access changed to ${status.replaceAll("_", " ")}.`, endpoint: "/api/platform/operations", correlation_id: access.correlationId, metadata: { reason } });
    return NextResponse.json({ ok: true, organisationId, status, reason, updatedAt });
  }

  if (body.action === "update_support") {
    const allowed = new Set(["open", "investigating", "waiting", "resolved", "closed"]);
    if (!body.supportCaseId || !body.supportStatus || !allowed.has(body.supportStatus)) return NextResponse.json({ error: "Choose a support case and valid status." }, { status: 400 });
    const resolved = ["resolved", "closed"].includes(body.supportStatus);
    const response = await fetch(`${db.url}/rest/v1/platform_support_cases?id=eq.${encodeURIComponent(body.supportCaseId)}`, {
      method: "PATCH",
      headers: { ...db.headers, Prefer: "return=representation" },
      body: JSON.stringify({ status: body.supportStatus, resolution_notes: body.resolutionNotes?.trim() || null, assigned_to: access.userId, updated_at: new Date().toISOString(), resolved_at: resolved ? new Date().toISOString() : null }),
      cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "Support case could not be updated." }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Choose a supported platform action." }, { status: 400 });
}

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

async function read(db: NonNullable<ReturnType<typeof database>>, path: string) {
  const response = await fetch(`${db.url}/rest/v1/${path}`, { headers: db.headers, cache: "no-store" });
  return { ok: response.ok, rows: response.ok ? await response.json() as unknown[] : [] };
}

async function writeEvent(db: NonNullable<ReturnType<typeof database>>, event: Record<string, unknown>) {
  await fetch(`${db.url}/rest/v1/platform_security_events`, { method: "POST", headers: { ...db.headers, Prefer: "return=minimal" }, body: JSON.stringify(event), cache: "no-store" });
}
