import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { organisationId?: string };
  if (!body.organisationId) return NextResponse.json({ ok: false, error: "Select an organisation workspace." }, { status: 400 });
  const resolved = await resolveUserAccessContext(request, { organisationId: body.organisationId });
  if (!resolved.context) {
    console.warn(JSON.stringify({ event: "workspace_switch_denied", endpoint: "/api/access/switch", correlationId: resolved.correlationId, timestamp: new Date().toISOString() }));
    return NextResponse.json({ ok: false, error: resolved.status === 403 ? "The requested workspace is unavailable." : resolved.error }, { status: resolved.status });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!url || !anonKey) return NextResponse.json({ ok: false, error: "Workspace switching is not configured." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/rpc/switch_active_organisation`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ requested_organisation_id: body.organisationId }),
    cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ ok: false, error: "The requested workspace is unavailable." }, { status: 403 });
  return NextResponse.json({ ok: true, context: resolved.context }, { headers: { "Cache-Control": "private, no-store" } });
}
