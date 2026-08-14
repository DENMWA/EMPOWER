import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Support reporting is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { title?: string; description?: string; category?: string; severity?: string; pagePath?: string; browser?: string; deploymentId?: string };
  const title = body.title?.trim() || "";
  const description = body.description?.trim() || "";
  const categories = new Set(["general", "access", "billing", "documents", "incidents", "notes", "rostering", "performance"]);
  const severities = new Set(["low", "normal", "high", "critical"]);
  if (title.length < 5 || description.length < 10) return NextResponse.json({ error: "Add a short title and enough detail to reproduce the issue." }, { status: 400 });
  if (title.length > 160 || description.length > 4000) return NextResponse.json({ error: "The issue report is too long." }, { status: 400 });

  const response = await fetch(`${url}/rest/v1/platform_support_cases`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      organisation_id: resolved.context.organisationId,
      submitted_by: resolved.context.userId,
      title,
      description,
      category: categories.has(body.category || "") ? body.category : "general",
      severity: severities.has(body.severity || "") ? body.severity : "normal",
      page_path: body.pagePath?.slice(0, 500) || null,
      browser: body.browser?.slice(0, 500) || null,
      deployment_id: body.deploymentId?.slice(0, 200) || null
    }),
    cache: "no-store"
  });
  const rows = response.ok ? await response.json() as Array<{ id: string }> : [];
  if (!response.ok || !rows[0]?.id) return NextResponse.json({ error: "The issue could not be submitted. Run the platform operations migration first." }, { status: 502 });
  return NextResponse.json({ ok: true, caseId: rows[0].id });
}
