import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Monitoring history is not configured." }, { status: 503 });

  const response = await fetch(`${url}/rest/v1/platform_health_incidents?select=id,check_id,check_name,severity,detail,source,first_detected_at,last_detected_at,resolved_at,occurrence_count&order=last_detected_at.desc&limit=50`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ error: "Monitoring history could not be loaded. Run the platform health SQL migration first." }, { status: 503 });
  return NextResponse.json({ incidents: await response.json() }, { headers: { "Cache-Control": "no-store" } });
}
