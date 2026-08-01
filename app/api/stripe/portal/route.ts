import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import { getOrganisationBilling, stripeRequest } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const organisation = await getOrganisationBilling(access.organisationId);
  if (!organisation?.stripe_customer_id) return NextResponse.json({ error: "Complete checkout before opening the billing portal." }, { status: 409 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const result = await stripeRequest<{ url?: string }>("/billing_portal/sessions", new URLSearchParams({
    customer: organisation.stripe_customer_id,
    return_url: `${appUrl}/admin/billing`
  }));
  if (!result.data?.url) return NextResponse.json({ error: result.error || "Stripe did not return a portal link." }, { status: 502 });
  return NextResponse.json({ url: result.data.url });
}
