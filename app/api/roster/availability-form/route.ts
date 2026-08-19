import { NextResponse } from "next/server";
import { createAvailabilityFormPdf } from "@/lib/availability-form-pdf";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "scheduling", "rostering.manage");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const body = await request.json() as { staffInviteId?: string; templateType?: "blank" | "staff" };
  const blankTemplate = body.templateType === "blank" || !body.staffInviteId;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "PDF generation is not configured." }, { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [staffResponse, organisationResponse] = await Promise.all([
    blankTemplate
      ? Promise.resolve(null)
      : fetch(`${url}/rest/v1/staff_invites?select=name&id=eq.${encodeURIComponent(body.staffInviteId || "")}&organisation_id=eq.${access.organisationId}&limit=1`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/organisations?select=name&id=eq.${access.organisationId}&limit=1`, { headers, cache: "no-store" })
  ]);
  const staff = staffResponse?.ok ? await staffResponse.json() as Array<{ name: string }> : [];
  const organisations = organisationResponse.ok ? await organisationResponse.json() as Array<{ name: string }> : [];
  if (!blankTemplate && !staff[0]) return NextResponse.json({ error: "Staff member was not found in this organisation." }, { status: 404 });
  const employeeName = blankTemplate ? "____________________________" : staff[0].name;
  const pdf = createAvailabilityFormPdf(employeeName, organisations[0]?.name || "EmpowerNotes");
  const safeName = blankTemplate ? "employee" : staff[0].name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "employee";
  return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeName}-availability.pdf"`, "Cache-Control": "private, no-store" } });
}
