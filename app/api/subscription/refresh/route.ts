import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import { refreshOrganisationSubscriptionFromStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "billing");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const result = await refreshOrganisationSubscriptionFromStripe(access.organisationId);
  if (!result.refreshed) {
    return NextResponse.json({ error: result.error || "Subscription status could not be refreshed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
