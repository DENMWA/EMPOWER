import { NextResponse } from "next/server";
import { fullAdminRoles } from "@/lib/admin-permissions";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const access = await verifyServerAccess(request, "admin", "people");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  if (!fullAdminRoles.has(access.role)) {
    return NextResponse.json({ error: "Only an owner or full administrator can deactivate or reactivate clients." }, { status: 403 });
  }

  const body = await request.json() as { clientId?: string; status?: string };
  if (!body.clientId || !["active", "inactive"].includes(body.status || "")) {
    return NextResponse.json({ error: "Select a valid client and status." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Secure client administration is not configured." }, { status: 503 });

  const response = await fetch(`${url}/rest/v1/participants_or_clients?id=eq.${encodeURIComponent(body.clientId)}&organisation_id=eq.${encodeURIComponent(access.organisationId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      status: body.status,
      deactivated_at: body.status === "inactive" ? new Date().toISOString() : null
    })
  });

  if (!response.ok) {
    console.error("Client lifecycle update failed", response.status, await response.text());
    return NextResponse.json({ error: "The client status could not be updated." }, { status: 502 });
  }

  return NextResponse.json(await response.json());
}
