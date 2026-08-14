import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseNdisCatalogueRows } from "@/lib/ndis-catalogue-parser";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBytes = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "billing", "billing.manage");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Secure NDIS pricing import is not configured." }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const effectiveFrom = String(form.get("effectiveFrom") || "");
    const versionName = String(form.get("versionName") || "").trim();
    if (!(file instanceof File) || !/\.(csv|xlsx)$/i.test(file.name)) return NextResponse.json({ error: "Choose the official NDIA Support Catalogue XLSX or CSV file." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) return NextResponse.json({ error: "Enter the catalogue effective date." }, { status: 400 });
    if (file.size > maxBytes) return NextResponse.json({ error: "The catalogue must be smaller than 20 MB." }, { status: 413 });

    const source = Buffer.from(await file.arrayBuffer());
    const rows = await parseNdisCatalogueRows(source, file.name);
    if (rows.length < 2) return NextResponse.json({ error: "The catalogue has no support item rows." }, { status: 422 });
    const headers = rows[0].map(normaliseHeader);
    const columns = resolveColumns(headers);
    if (columns.code < 0 || columns.name < 0 || columns.unit < 0 || !columns.priceColumns.length) {
      return NextResponse.json({ error: "This CSV does not contain the required NDIA support item number, name, unit and price-limit columns." }, { status: 422 });
    }

    const versionId = randomUUID();
    const supportItems = rows.slice(1).flatMap((row) => toSupportItems(row, columns, versionId, effectiveFrom));
    if (!supportItems.length) return NextResponse.json({ error: "No priced NDIA support items could be read from this catalogue." }, { status: 422 });
    const dbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
    const versionResponse = await fetch(`${url}/rest/v1/ndis_pricing_versions`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        id: versionId,
        organisation_id: access.organisationId,
        version_name: versionName || `NDIA Support Catalogue effective ${effectiveFrom}`,
        effective_from: effectiveFrom,
        source_name: "National Disability Insurance Agency",
        source_url: "https://www.ndis.gov.au/providers/pricing-arrangements",
        source_filename: file.name,
        import_method: file.name.toLowerCase().endsWith(".xlsx") ? "official_ndia_catalogue_xlsx" : "official_ndia_catalogue_csv",
        imported_by: access.userId,
        checksum: createHash("sha256").update(source).digest("hex"),
        status: "draft",
        import_summary: { rows: supportItems.length, sourceRows: rows.length - 1, regionalPriceColumns: columns.priceColumns.map((column) => column.label) },
        validation_warnings: ["Review the effective date, regional price columns and item count before activation."]
      })
    });
    if (!versionResponse.ok) throw new Error(`Pricing version save returned HTTP ${versionResponse.status}.`);
    for (let index = 0; index < supportItems.length; index += 500) {
      const response = await fetch(`${url}/rest/v1/ndis_support_items`, { method: "POST", headers: { ...dbHeaders, Prefer: "return=minimal" }, body: JSON.stringify(supportItems.slice(index, index + 500)) });
      if (!response.ok) throw new Error(`Support item import returned HTTP ${response.status}.`);
    }
    return NextResponse.json({ ok: true, versionId, itemCount: supportItems.length, sourceRowCount: rows.length - 1 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The NDIS catalogue could not be imported." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await verifyServerAccess(request, "admin", "billing", "billing.manage");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const { versionId } = await request.json() as { versionId?: string };
  if (!versionId) return NextResponse.json({ error: "Choose a draft catalogue version." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Secure NDIS pricing activation is not configured." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const pricedItemsResponse = await fetch(`${url}/rest/v1/ndis_support_items?pricing_version_id=eq.${encodeURIComponent(versionId)}&price_limit=gt.0&select=id&limit=1`, { headers });
  const pricedItems = pricedItemsResponse.ok ? await pricedItemsResponse.json() as Array<{ id: string }> : [];
  if (!pricedItems.length) return NextResponse.json({ error: "This catalogue has no positive NDIS prices and cannot be activated. Re-import the official NDIA pricing CSV." }, { status: 422 });
  const currentResponse = await fetch(`${url}/rest/v1/ndis_pricing_versions?organisation_id=eq.${encodeURIComponent(access.organisationId)}&status=eq.active`, { method: "PATCH", headers, body: JSON.stringify({ status: "superseded" }) });
  if (!currentResponse.ok) return NextResponse.json({ error: "The existing catalogue version could not be superseded." }, { status: 502 });
  const response = await fetch(`${url}/rest/v1/ndis_pricing_versions?id=eq.${encodeURIComponent(versionId)}&organisation_id=eq.${encodeURIComponent(access.organisationId)}&status=eq.draft`, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "active", reviewed_by: access.userId, reviewed_at: new Date().toISOString(), activated_by: access.userId, activated_at: new Date().toISOString() }) });
  const rows = response.ok ? await response.json() as Array<{ id: string }> : [];
  if (!rows.length) return NextResponse.json({ error: "The draft catalogue could not be activated." }, { status: 404 });
  return NextResponse.json({ ok: true, versionId });
}

type Columns = { code: number; name: number; unit: number; registrationGroup: number; category: number; claimType: number; timeBand: number; priceColumns: Array<{ index: number; label: string; region: string; remoteType: string }> };

function resolveColumns(headers: string[]): Columns {
  const find = (...terms: string[]) => headers.findIndex((header) => terms.some((term) => header.includes(term)));
  const code = find("support item number", "support item ref", "support item code", "item number");
  const name = find("support item name", "support item description", "item name");
  const unit = find("unit type", "unit of measure", "unit");
  const registrationGroup = find("registration group");
  const category = find("support category");
  const claimType = find("claim type");
  const timeBand = find("time band");
  const priceColumns = headers.map((header, index) => ({ header, index })).filter(({ header }) => /price limit|national non remote|remote|very remote|nsw|vic|qld|wa|sa|tas|act|nt/.test(header)).map(({ header, index }) => ({ index, label: header, region: inferRegion(header), remoteType: inferRemoteType(header) }));
  return { code, name, unit, registrationGroup, category, claimType, timeBand, priceColumns };
}

function toSupportItems(row: string[], columns: Columns, versionId: string, effectiveFrom: string) {
  const code = cell(row, columns.code);
  const name = cell(row, columns.name);
  if (!code || !name) return [];
  return columns.priceColumns.flatMap((column) => {
    const price = parsePrice(cell(row, column.index));
    if (price === null) return [];
    return [{ id: randomUUID(), pricing_version_id: versionId, support_item_number: code, support_item_name: name, registration_group: cell(row, columns.registrationGroup) || null, support_category: cell(row, columns.category) || null, unit_type: cell(row, columns.unit) || "each", claim_type: cell(row, columns.claimType) || null, time_band: cell(row, columns.timeBand) || null, state_or_region: column.region || null, remote_type: column.remoteType || null, price_limit: price, gst_code: "GST-free", effective_from: effectiveFrom, metadata: { sourcePriceColumn: column.label } }];
  });
}

function normaliseHeader(value: string) { return value.replace(/^\uFEFF/, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(); }
function cell(row: string[], index: number) { return index >= 0 ? String(row[index] || "").trim() : ""; }
function parsePrice(value: string) { const parsed = Number(value.replace(/[$,\s]/g, "")); return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null; }
function inferRemoteType(header: string) { return header.includes("very remote") ? "very_remote" : header.includes("remote") ? "remote" : "non_remote"; }
function inferRegion(header: string) { return ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"].find((region) => new RegExp(`\\b${region}\\b`).test(header))?.toUpperCase() || (header.includes("national") ? "National" : ""); }
