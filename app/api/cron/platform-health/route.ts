import { NextResponse } from "next/server";
import { runPlatformHealthScan, type PlatformHealthCheck } from "@/lib/platform-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncidentTransition = "new_critical" | "new_warning" | "resolved" | "updated" | "unchanged";
type IncidentResult = { ok: boolean; error?: string; transition?: IncidentTransition; check?: PlatformHealthCheck };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised scheduled monitor request." }, { status: 401 });
  }

  const snapshot = await runPlatformHealthScan();
  const persistence = await persistHealthIncidents(snapshot.checks, snapshot.checkedAt);
  if (!persistence.ok) return NextResponse.json({ ...snapshot, persistence }, { status: 503 });
  return NextResponse.json({ ...snapshot, persistence });
}

async function persistHealthIncidents(checks: PlatformHealthCheck[], checkedAt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, error: "Monitoring storage is not configured." };

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const results = await Promise.all(checks.map((check) => updateIncident(url, headers, check, checkedAt)));

  const newIssues = results.filter((result): result is IncidentResult & { check: PlatformHealthCheck } => Boolean(result.check) && (result.transition === "new_critical" || result.transition === "new_warning"));
  const resolvedIssues = results.filter((result): result is IncidentResult & { check: PlatformHealthCheck } => Boolean(result.check) && result.transition === "resolved");
  if (newIssues.length || resolvedIssues.length) await sendHealthAlertEmail(newIssues.map((r) => r.check), resolvedIssues.map((r) => r.check));

  const observations = await persistObservations(url, headers, checks);
  if (!observations.ok) return observations;
  const failed = results.find((result) => !result.ok);
  return failed || { ok: true, updated: results.length };
}

async function persistObservations(url: string, headers: Record<string, string>, checks: PlatformHealthCheck[]) {
  const apiChecks = checks.filter((check) => check.id !== "app-url").map((check) => ({ check_id: check.id, check_name: check.name, status: check.status, available: check.available, response_ms: check.responseMs, detail: check.detail, checked_at: check.checkedAt, expires_at: check.expiresAt }));
  const response = await fetch(`${url}/rest/v1/platform_api_health_observations`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(apiChecks), cache: "no-store" });
  return response.ok ? { ok: true } : { ok: false, error: `API health history returned HTTP ${response.status}. Run platform-api-health-observations.sql first.` };
}

async function updateIncident(url: string, headers: Record<string, string>, check: PlatformHealthCheck, checkedAt: string): Promise<IncidentResult> {
  const activeQuery = `${url}/rest/v1/platform_health_incidents?select=id,occurrence_count&check_id=eq.${encodeURIComponent(check.id)}&resolved_at=is.null&limit=1`;
  const activeResponse = await fetch(activeQuery, { headers, cache: "no-store" });
  if (!activeResponse.ok) return { ok: false, error: `Monitoring history returned HTTP ${activeResponse.status}.` };
  const active = await activeResponse.json() as Array<{ id: string; occurrence_count: number }>;

  if (check.status === "healthy") {
    if (!active[0]) return { ok: true, transition: "unchanged" };
    const response = await fetch(`${url}/rest/v1/platform_health_incidents?id=eq.${encodeURIComponent(active[0].id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ resolved_at: checkedAt, last_detected_at: checkedAt })
    });
    return response.ok ? { ok: true, transition: "resolved", check } : { ok: false, error: `Issue recovery update returned HTTP ${response.status}.` };
  }

  if (active[0]) {
    const response = await fetch(`${url}/rest/v1/platform_health_incidents?id=eq.${encodeURIComponent(active[0].id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ severity: check.status, detail: check.detail, last_detected_at: checkedAt, occurrence_count: active[0].occurrence_count + 1 })
    });
    return response.ok ? { ok: true, transition: "updated" } : { ok: false, error: `Issue update returned HTTP ${response.status}.` };
  }

  const response = await fetch(`${url}/rest/v1/platform_health_incidents`, {
    method: "POST",
    headers,
    body: JSON.stringify({ check_id: check.id, check_name: check.name, severity: check.status, detail: check.detail, first_detected_at: checkedAt, last_detected_at: checkedAt })
  });
  return response.ok ? { ok: true, transition: check.status === "critical" ? "new_critical" : "new_warning", check } : { ok: false, error: `Issue creation returned HTTP ${response.status}.` };
}

async function sendHealthAlertEmail(newIssues: PlatformHealthCheck[], resolvedIssues: PlatformHealthCheck[]) {
  const resend = process.env.RESEND_API_KEY;
  if (!resend) return;
  const recipients = (process.env.PLATFORM_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (!recipients.length) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.empowernotes.org").replace(/\/$/, "");
  const subjectParts = [];
  if (newIssues.some((check) => check.status === "critical")) subjectParts.push("critical issue");
  else if (newIssues.length) subjectParts.push("warning");
  if (resolvedIssues.length) subjectParts.push("recovered check");
  const subject = `EmpowerNotes system health: ${subjectParts.join(" + ") || "update"}`;

  const newIssuesHtml = newIssues.length ? `<h2 style="font-size:16px;color:#991b1b">New issues</h2>${newIssues.map((check) => `<div style="margin-bottom:12px"><strong>${escapeHtml(check.name)}</strong> (${escapeHtml(check.status)})<p style="margin:4px 0;line-height:1.5">${escapeHtml(check.detail)}</p></div>`).join("")}` : "";
  const resolvedHtml = resolvedIssues.length ? `<h2 style="font-size:16px;color:#065f46">Recovered</h2>${resolvedIssues.map((check) => `<div style="margin-bottom:8px"><strong>${escapeHtml(check.name)}</strong> is healthy again.</div>`).join("")}` : "";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "EmpowerNotes <notifications@empowernotes.org>",
      to: recipients,
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h1 style="font-size:20px;color:#087f73">EmpowerNotes system health</h1>${newIssuesHtml}${resolvedHtml}<p style="margin-top:16px"><a href="${escapeHtml(`${appUrl}/platform#diagnostics`)}">Open Diagnostics</a></p></div>`
    })
  }).catch(() => undefined);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] || character);
}
