import { createHash, randomUUID } from "node:crypto";
import { parseNdisCatalogueRows } from "@/lib/ndis-catalogue-parser";

const OFFICIAL_PAGE = "https://www.ndis.gov.au/providers/pricing-and-payments/pricing/what-support-catalogue";
const ALLOWED_HOSTS = new Set(["www.ndis.gov.au", "ndis.gov.au"]);

type DbConfig = { url: string; serviceKey: string };
type SupportItem = Record<string, unknown>;

export async function checkOfficialNdisPricing(config: DbConfig) {
  const checkedAt = new Date().toISOString();
  const pageResponse = await fetch(OFFICIAL_PAGE, { cache: "no-store", headers: { "User-Agent": "EmpowerNotes pricing monitor" } });
  if (!pageResponse.ok) throw new Error(`Official NDIS pricing page returned HTTP ${pageResponse.status}.`);
  const html = await pageResponse.text();
  const links = extractOfficialLinks(html);
  const preferred = links.find((link) => /\.csv(?:$|\?)/i.test(link)) || links.find((link) => /\.(xlsx|pdf|docx)(?:$|\?)/i.test(link));
  const pageChecksum = sha256(Buffer.from(html));
  const previous = await getMonitor(config);

  if (!preferred) {
    return saveMonitor(config, { checkedAt, pageChecksum, status: "review_required", alertStatus: "open", detail: "The official page changed or contains no downloadable catalogue. Review the source page before publishing prices.", detectedDownloadUrl: null, detectedFilename: null, detectedChecksum: null, draftVersionId: null });
  }
  const sourceUrl = new URL(preferred);
  if (!ALLOWED_HOSTS.has(sourceUrl.hostname.toLowerCase())) throw new Error("The detected pricing file is not hosted on an approved NDIS domain.");
  const fileResponse = await fetch(sourceUrl, { cache: "no-store", headers: { "User-Agent": "EmpowerNotes pricing monitor" } });
  if (!fileResponse.ok) throw new Error(`Official pricing file returned HTTP ${fileResponse.status}.`);
  const source = Buffer.from(await fileResponse.arrayBuffer());
  const checksum = sha256(source);
  const filename = decodeURIComponent(sourceUrl.pathname.split("/").pop() || "ndis-pricing-file");
  if (previous?.detected_checksum === checksum && (previous.draft_version_id || previous.published_version_id)) {
    return saveMonitor(config, { checkedAt, pageChecksum, status: previous.status || "current", alertStatus: previous.alert_status || "none", detail: "No new official pricing file detected.", detectedDownloadUrl: sourceUrl.toString(), detectedFilename: filename, detectedChecksum: checksum, draftVersionId: previous.draft_version_id || null });
  }
  if (!/\.(csv|xlsx)$/i.test(sourceUrl.pathname)) {
    return saveMonitor(config, { checkedAt, pageChecksum, status: "review_required", alertStatus: "open", detail: `${filename} is not a supported NDIS catalogue format. Review the official source before publishing.`, detectedDownloadUrl: sourceUrl.toString(), detectedFilename: filename, detectedChecksum: checksum, draftVersionId: null });
  }

  const effectiveFrom = inferEffectiveDate(filename, html);
  const imported = await importCatalogueDraft(config, source, filename, sourceUrl.toString(), effectiveFrom);
  await createDiff(config, imported.versionId);
  return saveMonitor(config, { checkedAt, pageChecksum, status: "draft_ready", alertStatus: "open", detail: `${imported.itemCount} official price rows imported as a draft. Review the comparison before publishing.`, detectedDownloadUrl: sourceUrl.toString(), detectedFilename: filename, detectedChecksum: checksum, draftVersionId: imported.versionId });
}

export async function publishPlatformNdisPricing(config: DbConfig, versionId: string, userId: string) {
  const headers = dbHeaders(config);
  const itemResponse = await fetch(`${config.url}/rest/v1/ndis_support_items?pricing_version_id=eq.${encodeURIComponent(versionId)}&price_limit=gt.0&select=id&limit=1`, { headers, cache: "no-store" });
  const items = itemResponse.ok ? await itemResponse.json() as Array<{ id: string }> : [];
  if (!items.length) throw new Error("This draft has no positive prices and cannot be published.");
  const draftResponse = await fetch(`${config.url}/rest/v1/ndis_pricing_versions?id=eq.${encodeURIComponent(versionId)}&organisation_id=is.null&status=eq.draft&select=id,effective_from`, { headers, cache: "no-store" });
  const drafts = draftResponse.ok ? await draftResponse.json() as Array<{ id: string; effective_from: string }> : [];
  if (!drafts.length) throw new Error("The platform pricing draft was not found.");
  const previousDay = new Date(`${drafts[0].effective_from}T00:00:00Z`); previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  await fetch(`${config.url}/rest/v1/ndis_pricing_versions?organisation_id=is.null&status=eq.active`, { method: "PATCH", headers, body: JSON.stringify({ status: "superseded", effective_to: previousDay.toISOString().slice(0, 10) }) });
  const published = await fetch(`${config.url}/rest/v1/ndis_pricing_versions?id=eq.${encodeURIComponent(versionId)}&organisation_id=is.null&status=eq.draft`, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "active", reviewed_by: userId, reviewed_at: new Date().toISOString(), activated_by: userId, activated_at: new Date().toISOString() }) });
  const rows = published.ok ? await published.json() as Array<{ id: string }> : [];
  if (!rows.length) throw new Error("The pricing draft could not be published.");
  await fetch(`${config.url}/rest/v1/ndis_pricing_source_monitors?id=eq.official-ndis`, { method: "PATCH", headers, body: JSON.stringify({ status: "current", alert_status: "resolved", detail: "The reviewed official pricing version is live.", published_version_id: versionId, updated_at: new Date().toISOString() }) });
  return { ok: true, versionId };
}

export async function getNdisPricingMonitorState(config: DbConfig) {
  const headers = dbHeaders(config);
  const [monitorResponse, versionsResponse, diffsResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/ndis_pricing_source_monitors?id=eq.official-ndis&select=*`, { headers, cache: "no-store" }),
    fetch(`${config.url}/rest/v1/ndis_pricing_versions?organisation_id=is.null&select=id,version_name,effective_from,effective_to,status,source_url,source_filename,imported_at,activated_at&order=imported_at.desc&limit=8`, { headers, cache: "no-store" }),
    fetch(`${config.url}/rest/v1/ndis_pricing_version_diffs?organisation_id=is.null&select=*&order=created_at.desc&limit=8`, { headers, cache: "no-store" })
  ]);
  if (!monitorResponse.ok) throw new Error("Run the central NDIS pricing monitor migration before using this panel.");
  return { monitor: (await monitorResponse.json() as unknown[])[0] || null, versions: versionsResponse.ok ? await versionsResponse.json() : [], diffs: diffsResponse.ok ? await diffsResponse.json() : [] };
}

function extractOfficialLinks(html: string) {
  const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]).filter((href) => /pricing|support.catalogue|support.catalog/i.test(href) && /\.(csv|xlsx|pdf|docx)(?:$|\?)/i.test(href));
  return Array.from(new Set(links.map((href) => new URL(href, OFFICIAL_PAGE).toString())));
}
function inferEffectiveDate(filename: string, html: string) { const financialYear = filename.match(/(20\d{2})\s*[-–]\s*(?:20)?\d{2}/); if (financialYear) return `${financialYear[1]}-07-01`; const match = `${filename} ${html.slice(0, 20000)}`.match(/(?:effective\s*)?(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i); if (!match) return new Date().toISOString().slice(0, 10); const month = new Date(`${match[2]} 1, 2000`).getMonth() + 1; return `${match[3]}-${String(month).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`; }
function sha256(value: Buffer) { return createHash("sha256").update(value).digest("hex"); }
function dbHeaders(config: DbConfig) { return { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, "Content-Type": "application/json" }; }
async function getMonitor(config: DbConfig) { const response = await fetch(`${config.url}/rest/v1/ndis_pricing_source_monitors?id=eq.official-ndis&select=*`, { headers: dbHeaders(config), cache: "no-store" }); return response.ok ? (await response.json() as any[])[0] : null; }
async function saveMonitor(config: DbConfig, value: any) { const body = { id: "official-ndis", source_url: OFFICIAL_PAGE, last_checked_at: value.checkedAt, page_checksum: value.pageChecksum, status: value.status, alert_status: value.alertStatus, detail: value.detail, detected_download_url: value.detectedDownloadUrl, detected_filename: value.detectedFilename, detected_checksum: value.detectedChecksum, draft_version_id: value.draftVersionId, updated_at: value.checkedAt }; const response = await fetch(`${config.url}/rest/v1/ndis_pricing_source_monitors?on_conflict=id`, { method: "POST", headers: { ...dbHeaders(config), Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) }); if (!response.ok) throw new Error("The NDIS pricing monitor state could not be saved."); return (await response.json() as unknown[])[0]; }

async function importCatalogueDraft(config: DbConfig, source: Buffer, filename: string, sourceUrl: string, effectiveFrom: string) {
  const rows = await parseNdisCatalogueRows(source, filename); const headers = rows[0]?.map(normaliseHeader) || []; const columns = resolveColumns(headers);
  if (columns.code < 0 || columns.name < 0 || columns.unit < 0 || !columns.priceColumns.length) throw new Error("The official catalogue format changed and needs developer review.");
  const versionId = randomUUID(); const items = rows.slice(1).flatMap((row) => toItems(row, columns, versionId, effectiveFrom));
  if (!items.length) throw new Error("No positive support prices were found in the official CSV.");
  const headersDb = dbHeaders(config);
  const importMethod = filename.toLowerCase().endsWith(".xlsx") ? "automatic_official_ndis_xlsx" : "automatic_official_ndis_csv";
  const version = await fetch(`${config.url}/rest/v1/ndis_pricing_versions`, { method: "POST", headers: headersDb, body: JSON.stringify({ id: versionId, organisation_id: null, version_name: `Official NDIS pricing effective ${effectiveFrom}`, effective_from: effectiveFrom, source_name: "National Disability Insurance Agency", source_url: sourceUrl, source_filename: filename, import_method: importMethod, checksum: sha256(source), status: "draft", import_summary: { rows: items.length, sourceRows: rows.length - 1 }, validation_warnings: ["Developer review and explicit publication are required."] }) });
  if (!version.ok) throw new Error("The platform pricing draft could not be saved.");
  for (let i = 0; i < items.length; i += 500) { const response = await fetch(`${config.url}/rest/v1/ndis_support_items`, { method: "POST", headers: headersDb, body: JSON.stringify(items.slice(i, i + 500)) }); if (!response.ok) throw new Error("The platform support prices could not be saved."); }
  await fetch(`${config.url}/rest/v1/ndis_pricing_import_jobs`, { method: "POST", headers: headersDb, body: JSON.stringify({ organisation_id: null, import_method: importMethod, source_url: sourceUrl, source_filename: filename, status: "completed", started_at: new Date().toISOString(), completed_at: new Date().toISOString(), result_pricing_version_id: versionId }) });
  return { versionId, itemCount: items.length };
}
async function createDiff(config: DbConfig, draftId: string) { const headers = dbHeaders(config); const [draftResponse, activeResponse] = await Promise.all([fetch(`${config.url}/rest/v1/ndis_support_items?pricing_version_id=eq.${draftId}&select=support_item_number,support_item_name,support_category,price_limit,state_or_region,remote_type`, { headers }), fetch(`${config.url}/rest/v1/ndis_pricing_versions?organisation_id=is.null&status=eq.active&select=id&limit=1`, { headers })]); const active = activeResponse.ok ? (await activeResponse.json() as any[])[0] : null; const draft = draftResponse.ok ? await draftResponse.json() as any[] : []; let old: any[] = []; if (active) { const response = await fetch(`${config.url}/rest/v1/ndis_support_items?pricing_version_id=eq.${active.id}&select=support_item_number,support_item_name,support_category,price_limit,state_or_region,remote_type`, { headers }); if (response.ok) old = await response.json(); } const key = (x:any) => `${x.support_item_number}|${x.state_or_region || ""}|${x.remote_type || ""}`; const oldMap = new Map(old.map(x => [key(x), x])); const draftMap = new Map(draft.map(x => [key(x), x])); let changedPrice=0, changedName=0, changedCategory=0; for (const [k, item] of draftMap) { const prior:any=oldMap.get(k); if (!prior) continue; if (Number(prior.price_limit)!==Number((item as any).price_limit)) changedPrice++; if(prior.support_item_name!==(item as any).support_item_name) changedName++; if(prior.support_category!==(item as any).support_category) changedCategory++; } await fetch(`${config.url}/rest/v1/ndis_pricing_version_diffs`, { method:"POST", headers, body:JSON.stringify({ organisation_id:null, draft_pricing_version_id:draftId, compared_against_version_id:active?.id||null, new_items_count:[...draftMap.keys()].filter(k=>!oldMap.has(k)).length, removed_items_count:[...oldMap.keys()].filter(k=>!draftMap.has(k)).length, changed_price_count:changedPrice, changed_name_count:changedName, changed_category_count:changedCategory, diff_summary:{draftRows:draft.length,activeRows:old.length} }) }); }

type Columns={code:number;name:number;unit:number;category:number;priceColumns:Array<{index:number;region:string;remoteType:string}>};
function resolveColumns(headers:string[]):Columns { const find=(...terms:string[])=>headers.findIndex(h=>terms.some(t=>h.includes(t))); return { code:find("support item number","support item code","item number"), name:find("support item name","support item description","item name"), unit:find("unit type","unit of measure","unit"), category:find("support category"), priceColumns:headers.map((h,index)=>({h,index})).filter(x=>/price limit|national non remote|remote|very remote|nsw|vic|qld|wa|sa|tas|act|nt/.test(x.h)).map(x=>({index:x.index,region:inferRegion(x.h),remoteType:inferRemoteType(x.h)})) }; }
function toItems(row:string[],c:Columns,versionId:string,effectiveFrom:string):SupportItem[]{ const code=cell(row,c.code),name=cell(row,c.name); if(!code||!name)return[]; return c.priceColumns.flatMap(p=>{const price=parsePrice(cell(row,p.index)); return price===null?[]:[{id:randomUUID(),pricing_version_id:versionId,support_item_number:code,support_item_name:name,support_category:cell(row,c.category)||null,unit_type:cell(row,c.unit)||"each",state_or_region:p.region||null,remote_type:p.remoteType,price_limit:price,gst_code:"GST-free",effective_from:effectiveFrom,metadata:{source:"official-ndis-monitor"}}]}); }
function normaliseHeader(v:string){return v.replace(/^\uFEFF/,"").toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ").trim();} function cell(r:string[],i:number){return i>=0?String(r[i]||"").trim():"";} function parsePrice(v:string){const n=Number(v.replace(/[$,\s]/g,""));return Number.isFinite(n)&&n>0?Math.round(n*100)/100:null;} function inferRemoteType(h:string){return h.includes("very remote")?"very_remote":h.includes("remote")?"remote":"non_remote";} function inferRegion(h:string){return ["nsw","vic","qld","wa","sa","tas","act","nt"].find(r=>new RegExp(`\\b${r}\\b`).test(h))?.toUpperCase()||(h.includes("national")?"National":"");}
