import { NextResponse } from "next/server";
import { createInvoicePdf } from "@/lib/invoice-pdf";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "billing");
  if (!access.allowed) return NextResponse.json({ message: access.reason }, { status: access.status });
  const { invoiceId } = await request.json() as { invoiceId?: string };
  if (!invoiceId) return NextResponse.json({ message: "Select an invoice to export." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Secure invoice export is not configured." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const query = (table: string, params: URLSearchParams) => fetch(`${url}/rest/v1/${table}?${params}`, { headers, cache: "no-store" });
  const organisationFilter = access.organisationId;
  const [invoiceResponse, linesResponse, profileResponse] = await Promise.all([
    query("native_invoices", new URLSearchParams({ select: "*", id: `eq.${invoiceId}`, organisation_id: `eq.${organisationFilter}`, limit: "1" })),
    query("native_invoice_lines", new URLSearchParams({ select: "*", invoice_id: `eq.${invoiceId}`, organisation_id: `eq.${organisationFilter}`, order: "service_date.asc,created_at.asc" })),
    query("organisation_profiles", new URLSearchParams({ select: "*", organisation_id: `eq.${organisationFilter}`, limit: "1" }))
  ]);
  if (![invoiceResponse, linesResponse, profileResponse].every((response) => response.ok)) return NextResponse.json({ message: "The tenant-scoped invoice record could not be loaded." }, { status: 502 });
  const invoiceRows = await invoiceResponse.json() as Array<Record<string, unknown>>;
  const lineRows = await linesResponse.json() as Array<Record<string, unknown>>;
  const profileRows = await profileResponse.json() as Array<Record<string, unknown>>;
  const row = invoiceRows[0];
  if (!row) return NextResponse.json({ message: "Invoice not found in the active organisation." }, { status: 404 });
  const participantResponse = await query("participants_or_clients", new URLSearchParams({ select: "name", id: `eq.${String(row.participant_id)}`, organisation_id: `eq.${organisationFilter}`, limit: "1" }));
  if (!participantResponse.ok) return NextResponse.json({ message: "The invoice participant could not be verified in the active organisation." }, { status: 502 });
  const participantRows = await participantResponse.json() as Array<{ name?: string }>;
  const text = (value: unknown) => typeof value === "string" ? value : "";
  const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const profile = profileRows[0] || {};
  const includeOrganisationBranding = profile.include_in_downloads !== false;
  const pdf = createInvoicePdf({
    invoiceNumber: text(row.invoice_number), invoiceDate: text(row.invoice_date), dueDate: text(row.due_date), participantName: participantRows[0]?.name || "Participant",
    participantNdisNumber: text(row.participant_ndis_number), recipientName: text(row.recipient_name), recipientEmail: text(row.recipient_email), billingPeriodStart: text(row.billing_period_start), billingPeriodEnd: text(row.billing_period_end), totalAmount: number(row.total_amount), paymentStatus: text(row.payment_status)
  }, lineRows.map((line) => ({ serviceDate: text(line.service_date), supportItemNumber: text(line.support_item_number), quantity: number(line.quantity), unitType: text(line.unit_type), rate: number(line.rate), amount: number(line.amount), gstCode: text(line.gst_code) })), {
    organisationName: includeOrganisationBranding ? text(profile.organisation_name) : "EmpowerNotes",
    abn: includeOrganisationBranding ? text(profile.abn) : "",
    providerNumber: includeOrganisationBranding ? text(profile.provider_number) : "",
    email: includeOrganisationBranding ? text(profile.email) : "",
    phone: includeOrganisationBranding ? text(profile.phone) : "",
    address: includeOrganisationBranding ? text(profile.address) : "",
    paymentTerms: includeOrganisationBranding ? text(profile.payment_terms) : "",
    paymentInstructions: includeOrganisationBranding ? text(profile.payment_instructions) : "",
    logoDataUrl: includeOrganisationBranding ? text(profile.logo_data_url) : ""
  });
  const filename = `${text(row.invoice_number).replace(/[^a-z0-9-]+/gi, "-") || "invoice"}.pdf`;
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
