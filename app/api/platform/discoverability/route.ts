import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const periods = new Set([7, 30, 90, 365]);
const platforms = new Set(["chatgpt", "google", "gemini", "copilot", "perplexity", "bing", "other"]);
const outcomes = new Set(["cited", "mentioned", "not_found"]);
const aiHosts = ["chatgpt.com", "openai.com", "perplexity.ai", "gemini.google.com", "copilot.microsoft.com", "claude.ai"];

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const db = database();
  if (!db) return NextResponse.json({ error: "Discoverability storage is not configured." }, { status: 503 });
  const requested = Number(new URL(request.url).searchParams.get("days") || 30);
  const days = periods.has(requested) ? requested : 30;
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString();

  const [google, referrals, citations, crawlers, storedSearch, resources] = await Promise.all([
    loadGoogleSearch(days),
    read<VisitorRow>(db, `marketing_visitors?select=first_referrer,first_landing_path,created_at&created_at=gte.${encodeURIComponent(from)}&limit=5000`),
    read<CitationRow>(db, `platform_discoverability_citations?select=id,platform,query_text,outcome,cited_url,position,notes,checked_at&checked_at=gte.${encodeURIComponent(from)}&order=checked_at.desc&limit=500`),
    read<CrawlerRow>(db, `platform_ai_crawler_events?select=crawler,path,response_status,occurred_at&occurred_at=gte.${encodeURIComponent(from)}&order=occurred_at.desc&limit=5000`),
    read<SearchMetricRow>(db, `platform_search_daily_metrics?select=metric_date,source,impressions,clicks,average_position,indexed_pages,captured_at&metric_date=gte.${dateKey(from)}&order=metric_date.asc`),
    checkPublicResources()
  ]);

  const aiReferrals = referrals.rows.filter((row) => aiHosts.some((host) => hostOf(row.first_referrer).includes(host)));
  const citationRows = citations.rows;
  const cited = citationRows.filter((row) => row.outcome === "cited").length;
  const mentioned = citationRows.filter((row) => row.outcome === "mentioned").length;
  const checked = citationRows.length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    periodDays: days,
    search: google.configured ? google : storedSearchPayload(storedSearch.rows),
    ai: {
      referrals: aiReferrals.length,
      referralSources: group(aiReferrals.map((row) => friendlyAiSource(row.first_referrer))),
      crawlerRequests: crawlers.rows.length,
      crawlers: group(crawlers.rows.map((row) => row.crawler)),
      citationChecks: checked,
      cited,
      mentioned,
      coverage: checked ? Math.round(((cited + mentioned * 0.5) / checked) * 100) : 0
    },
    resources,
    citations: citationRows,
    connections: {
      google: google.connected,
      bing: Boolean(process.env.BING_WEBMASTER_API_KEY),
      crawlerLogDrain: crawlers.ok
    },
    availability: { referrals: referrals.ok, citations: citations.ok, crawlers: crawlers.ok, storedSearch: storedSearch.ok }
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  const db = database();
  if (!db) return NextResponse.json({ error: "Discoverability storage is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { platform?: string; query?: string; outcome?: string; citedUrl?: string; position?: number; notes?: string };
  const platform = body.platform?.trim().toLowerCase() || "";
  const query = body.query?.trim() || "";
  const outcome = body.outcome?.trim().toLowerCase() || "";
  if (!platforms.has(platform) || !outcomes.has(outcome) || query.length < 3 || query.length > 500) return NextResponse.json({ error: "Add a valid platform, query and result." }, { status: 400 });
  const response = await fetch(`${db.url}/rest/v1/platform_discoverability_citations`, { method: "POST", headers: { ...db.headers, Prefer: "return=representation" }, body: JSON.stringify({ platform, query_text: query, outcome, cited_url: safeUrl(body.citedUrl), position: positiveInteger(body.position), notes: body.notes?.trim().slice(0, 1000) || null, checked_by: access.userId }), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Citation check could not be saved. Run platform-discoverability-intelligence.sql first." }, { status: 502 });
  return NextResponse.json({ ok: true });
}

type VisitorRow = { first_referrer: string | null; first_landing_path: string | null; created_at: string };
type CitationRow = { id:string;platform:string;query_text:string;outcome:"cited"|"mentioned"|"not_found";cited_url:string|null;position:number|null;notes:string|null;checked_at:string };
type CrawlerRow = { crawler:string;path:string;response_status:number|null;occurred_at:string };
type SearchMetricRow = { metric_date:string;source:"google"|"bing";impressions:number;clicks:number;average_position:number|null;indexed_pages:number|null;captured_at:string };

function database() { const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY; return url&&key?{url,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"}}:null; }
async function read<T>(db:NonNullable<ReturnType<typeof database>>,path:string){const response=await fetch(`${db.url}/rest/v1/${path}`,{headers:db.headers,cache:"no-store"});return{ok:response.ok,rows:response.ok?await response.json() as T[]:[]};}
function hostOf(value:string|null){try{return new URL(value||"").hostname.toLowerCase();}catch{return "";}}
function friendlyAiSource(value:string|null){const host=hostOf(value);if(host.includes("chatgpt")||host.includes("openai"))return"ChatGPT";if(host.includes("perplexity"))return"Perplexity";if(host.includes("gemini"))return"Gemini";if(host.includes("copilot"))return"Copilot";if(host.includes("claude"))return"Claude";return"Other AI";}
function group(values:string[]){return Object.entries(values.reduce<Record<string,number>>((all,value)=>({...all,[value]:(all[value]||0)+1}),{})).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);}
function dateKey(value:string){return value.slice(0,10);}
function positiveInteger(value:unknown){const number=Number(value);return Number.isInteger(number)&&number>0?number:null;}
function safeUrl(value:unknown){if(typeof value!=="string"||!value.trim())return null;try{const url=new URL(value.trim());return ["http:","https:"].includes(url.protocol)?url.toString().slice(0,1000):null;}catch{return null;}}

async function checkPublicResources(){const base="https://www.empowernotes.org";return Promise.all([["llms.txt","/llms.txt"],["AI manifest","/.ai/manifest.json"],["OpenAPI","/openapi.json"],["Capabilities API","/api/public/capabilities"],["MCP registry","/api/mcp"]].map(async([name,path])=>{const started=Date.now();try{const response=await fetch(`${base}${path}`,path==="/api/mcp"?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"initialize",params:{}}),cache:"no-store"}:{cache:"no-store"});return{name,path,ok:response.ok,status:response.status,responseMs:Date.now()-started};}catch{return{name,path,ok:false,status:0,responseMs:Date.now()-started};}}));}

async function loadGoogleSearch(days:number){const clientId=process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,clientSecret=process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,refreshToken=process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN; if(!clientId||!clientSecret||!refreshToken)return{configured:false,connected:false,source:"google",rows:[],totals:{impressions:0,clicks:0,ctr:0,position:null},error:"Google Search Console is not connected."};try{const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"}),cache:"no-store"});const token=await tokenResponse.json() as{access_token?:string};if(!tokenResponse.ok||!token.access_token)throw new Error("Google authorisation failed.");const end=new Date(Date.now()-2*86400000),start=new Date(end.getTime()-(days-1)*86400000),site=process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL||"sc-domain:empowernotes.org";const response=await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,{method:"POST",headers:{Authorization:`Bearer ${token.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({startDate:dateKey(start.toISOString()),endDate:dateKey(end.toISOString()),dimensions:["date"],rowLimit:25000,dataState:"final"}),cache:"no-store"});const result=await response.json() as{rows?:Array<{keys:string[];clicks:number;impressions:number;ctr:number;position:number}>};if(!response.ok)throw new Error("Google Search Console query failed.");const rows=(result.rows||[]).map(row=>({date:row.keys[0],clicks:row.clicks,impressions:row.impressions,ctr:row.ctr,position:row.position}));const impressions=rows.reduce((sum,row)=>sum+row.impressions,0),clicks=rows.reduce((sum,row)=>sum+row.clicks,0);return{configured:true,connected:true,source:"google",rows,totals:{impressions,clicks,ctr:impressions?clicks/impressions:0,position:weightedPosition(rows)},error:""};}catch(error){return{configured:true,connected:false,source:"google",rows:[],totals:{impressions:0,clicks:0,ctr:0,position:null},error:error instanceof Error?error.message:"Google Search Console could not be loaded."};}}
function weightedPosition(rows:Array<{impressions:number;position:number}>){const impressions=rows.reduce((sum,row)=>sum+row.impressions,0);return impressions?rows.reduce((sum,row)=>sum+row.position*row.impressions,0)/impressions:null;}
function storedSearchPayload(rows:SearchMetricRow[]){const selected=rows.filter(row=>row.source==="google");const impressions=selected.reduce((sum,row)=>sum+Number(row.impressions),0),clicks=selected.reduce((sum,row)=>sum+Number(row.clicks),0);return{configured:false,connected:false,source:"stored",rows:selected.map(row=>({date:row.metric_date,impressions:Number(row.impressions),clicks:Number(row.clicks),ctr:Number(row.impressions)?Number(row.clicks)/Number(row.impressions):0,position:row.average_position})),totals:{impressions,clicks,ctr:impressions?clicks/impressions:0,position:null},error:"Connect Google Search Console for verified live metrics."};}
