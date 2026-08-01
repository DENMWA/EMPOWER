import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) {
    return NextResponse.json({ ok: false, error: access.reason }, { status: access.status });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ ok: false, service: "Supabase", status: "configuration_required" }, { status: 503 });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/organisations?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: request.headers.get("authorization") || ""
      },
      cache: "no-store"
    });

    return NextResponse.json({
      ok: response.ok,
      service: "Supabase",
      status: response.ok ? "connected" : "unavailable",
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    }, { status: response.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, service: "Supabase", status: "unavailable" }, { status: 503 });
  }
}
