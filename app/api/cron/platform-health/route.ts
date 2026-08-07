import { NextResponse } from "next/server";
import { runPlatformHealthScan, type PlatformHealthCheck } from "@/lib/platform-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const failed = results.find((result) => !result.ok);
  return failed || { ok: true, updated: results.length };
}

async function updateIncident(url: string, headers: Record<string, string>, check: PlatformHealthCheck, checkedAt: string) {
  const activeQuery = `${url}/rest/v1/platform_health_incidents?select=id,occurrence_count&check_id=eq.${encodeURIComponent(check.id)}&resolved_at=is.null&limit=1`;
  const activeResponse = await fetch(activeQuery, { headers, cache: "no-store" });
  if (!activeResponse.ok) return { ok: false, error: `Monitoring history returned HTTP ${activeResponse.status}.` };
  const active = await activeResponse.json() as Array<{ id: string; occurrence_count: number }>;

  if (check.status === "healthy") {
    if (!active[0]) return { ok: true };
    const response = await fetch(`${url}/rest/v1/platform_health_incidents?id=eq.${encodeURIComponent(active[0].id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ resolved_at: checkedAt, last_detected_at: checkedAt })
    });
    return response.ok ? { ok: true } : { ok: false, error: `Issue recovery update returned HTTP ${response.status}.` };
  }

  if (active[0]) {
    const response = await fetch(`${url}/rest/v1/platform_health_incidents?id=eq.${encodeURIComponent(active[0].id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ severity: check.status, detail: check.detail, last_detected_at: checkedAt, occurrence_count: active[0].occurrence_count + 1 })
    });
    return response.ok ? { ok: true } : { ok: false, error: `Issue update returned HTTP ${response.status}.` };
  }

  const response = await fetch(`${url}/rest/v1/platform_health_incidents`, {
    method: "POST",
    headers,
    body: JSON.stringify({ check_id: check.id, check_name: check.name, severity: check.status, detail: check.detail, first_detected_at: checkedAt, last_detected_at: checkedAt })
  });
  return response.ok ? { ok: true } : { ok: false, error: `Issue creation returned HTTP ${response.status}.` };
}
