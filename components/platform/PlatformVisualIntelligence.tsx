"use client";

import { useMemo, useState } from "react";
import { BarChart3, Building2, CreditCard, TrendingUp } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

type Organisation = { id: string; name: string; tier: string; billingState: string; users: number; clients: number; platformAccessStatus: string };
type PaymentProvider = { organisationId: string; organisationName: string; lifetimePaidCents: number; missedPayments: number; outstandingCents: number; overdueDays: number; risk: boolean; lastPaidAt: string };
type PaymentMonth = { month: string; totalPaidCents: number; providers: Array<{ organisationId: string; organisationName: string; paidCents: number }> };
type Snapshot = { snapshot_date: string; organisation_id: string; subscription_tier: string; users_count: number; clients_count: number; houses_count: number; incidents_count: number; ai_notes_count: number; documents_count: number; invoice_lines_count: number; storage_bytes: number; collected_revenue_cents: number; outstanding_revenue_cents: number };
type Usage = { organisation_id: string; active_houses: number };
type SecurityEvent = { severity: string; occurred_at: string };
type SupportCase = { status: string; severity: string; created_at: string };
type NdisMatchEvent = { organisation_id: string; outcome: "success" | "failure"; match_source: "ai" | "rules" | "none"; failure_category: string | null; selected_support_item_number: string | null; selected_price: number | null; confidence: number | null; candidate_count: number; occurred_at: string };

type Props = {
  organisations: Organisation[];
  payments: { providers: PaymentProvider[]; monthly: PaymentMonth[] };
  snapshots: Snapshot[];
  usage: Usage[];
  securityEvents: SecurityEvent[];
  supportCases: SupportCase[];
  ndisMatchEvents: NdisMatchEvent[];
};

type Detail = { title: string; value: string; comparison: string; facts: Array<[string, string]>; tone?: "green" | "amber" | "red" | "blue" };

const colours = ["#0f766e", "#0369a1", "#059669", "#4f46e5", "#d97706", "#be123c"];

export function PlatformVisualIntelligence({ organisations, payments, snapshots, usage, securityEvents, supportCases, ndisMatchEvents }: Props) {
  const [detail, setDetail] = useState<Detail>(() => ({ title: "Live platform", value: `${organisations.length} organisations`, comparison: "Select any chart element for exact details.", facts: [["Data", "Production records"], ["Refresh", "Every two minutes"]], tone: "blue" }));
  const latestUsage = useMemo(() => { const map = new Map<string, Usage>(); usage.forEach((row) => { if (!map.has(row.organisation_id)) map.set(row.organisation_id, row); }); return map; }, [usage]);
  const growth = useMemo(() => aggregateSnapshots(snapshots), [snapshots]);
  const activity = useMemo(() => aggregateActivity(snapshots), [snapshots]);
  const tiers = ["solo", "practice", "provider", "enterprise"].map((tier) => ({ tier, value: organisations.filter((item) => item.tier === tier).length }));
  const maxClients = Math.max(1, ...organisations.map((item) => item.clients));
  const ageing = [
    { label: "Current", min: 0, max: 0, colour: "bg-emerald-600" },
    { label: "1-29 days", min: 1, max: 29, colour: "bg-sky-600" },
    { label: "30-59 days", min: 30, max: 59, colour: "bg-amber-500" },
    { label: "60+ days", min: 60, max: Infinity, colour: "bg-red-600" }
  ].map((bucket) => ({ ...bucket, providers: payments.providers.filter((item) => item.overdueDays >= bucket.min && item.overdueDays <= bucket.max) }));
  const maxAgeing = Math.max(1, ...ageing.map((item) => item.providers.length));
  const security = ["info", "warning", "critical"].map((severity) => ({ label: capitalise(severity), value: securityEvents.filter((item) => item.severity === severity).length, colour: severity === "critical" ? "bg-red-600" : severity === "warning" ? "bg-amber-500" : "bg-sky-600" }));
  const support = ["open", "investigating", "waiting", "resolved", "closed"].map((status) => ({ label: capitalise(status), value: supportCases.filter((item) => item.status === status).length, colour: status === "resolved" || status === "closed" ? "bg-emerald-600" : status === "investigating" ? "bg-sky-600" : "bg-amber-500" }));

  return <section aria-labelledby="platform-visual-intelligence-heading">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Visual intelligence</p><h2 id="platform-visual-intelligence-heading" className="mt-1 text-2xl font-bold text-ink">Live platform signals</h2></div><StatusBadge label="Auto-refreshing" tone="green" /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <ChartPanel title="Platform growth" subtitle="Organisations, users and clients" icon={TrendingUp}>
          <MultiLineChart points={growth} onSelect={(point) => setDetail({ title: formatDate(point.date), value: `${point.clients} clients`, comparison: `${point.organisations} organisations across the platform`, facts: [["Users", String(point.users)], ["Clients", String(point.clients)], ["Organisations", String(point.organisations)]], tone: "blue" })} />
        </ChartPanel>

        <ChartPanel title="Revenue collected" subtitle="Successful Stripe invoices by month" icon={CreditCard}>
          <RevenueChart months={payments.monthly} onSelect={(month) => setDetail({ title: formatMonth(month.month), value: formatAud(month.totalPaidCents), comparison: "Collected subscription revenue", facts: month.providers.sort((a, b) => b.paidCents - a.paidCents).slice(0, 5).map((item) => [item.organisationName, formatAud(item.paidCents)]), tone: "green" })} />
        </ChartPanel>

        <ChartPanel title="Plan mix" subtitle="Current organisations by tier" icon={BarChart3}>
          <div className="grid gap-5 sm:grid-cols-[9rem_1fr] sm:items-center"><Donut values={tiers.map((item) => item.value)} /><div className="space-y-2">{tiers.map((item, index) => <button key={item.tier} type="button" onClick={() => setDetail({ title: `${capitalise(item.tier)} plan`, value: `${item.value} organisations`, comparison: `${percentage(item.value, organisations.length)} of providers`, facts: organisations.filter((org) => org.tier === item.tier).slice(0, 6).map((org) => [org.name, org.billingState]), tone: "blue" })} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-slate-50"><span className="flex items-center gap-2 capitalize"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colours[index] }} />{item.tier}</span><strong>{item.value}</strong></button>)}</div></div>
        </ChartPanel>

        <ChartPanel title="Payment ageing" subtitle="Providers requiring billing attention" icon={CreditCard}>
          <div className="space-y-3">{ageing.map((bucket) => <button key={bucket.label} type="button" onClick={() => setDetail({ title: bucket.label, value: `${bucket.providers.length} providers`, comparison: bucket.providers.length ? "Accounts in this payment-age band" : "No providers currently in this band", facts: bucket.providers.slice(0, 6).map((item) => [item.organisationName, item.outstandingCents ? formatAud(item.outstandingCents) : "Current"]), tone: bucket.min >= 60 ? "red" : bucket.min >= 30 ? "amber" : "green" })} className="grid w-full grid-cols-[6rem_1fr_2rem] items-center gap-3 text-left text-sm"><span>{bucket.label}</span><span className="h-8 overflow-hidden rounded-md bg-slate-100"><span className={cn("block h-full rounded-md transition-all", bucket.colour)} style={{ width: `${Math.max(bucket.providers.length ? 8 : 0, bucket.providers.length / maxAgeing * 100)}%` }} /></span><strong className="text-right">{bucket.providers.length}</strong></button>)}</div>
        </ChartPanel>

        <ChartPanel title="Organisation scale" subtitle="Clients with users and houses in context" icon={Building2} className="lg:col-span-2">
          <div className="space-y-3">{organisations.slice().sort((a, b) => b.clients - a.clients).slice(0, 12).map((organisation, index) => { const houses = latestUsage.get(organisation.id)?.active_houses || 0; return <button key={organisation.id} type="button" onClick={() => setDetail({ title: organisation.name, value: `${organisation.clients} clients`, comparison: `${capitalise(organisation.tier)} · ${organisation.billingState}`, facts: [["Users", String(organisation.users)], ["Houses", String(houses)], ["Platform access", organisation.platformAccessStatus.replaceAll("_", " ")]], tone: organisation.platformAccessStatus === "active" ? "green" : "amber" })} className="grid w-full gap-2 text-left sm:grid-cols-[12rem_1fr_8rem] sm:items-center"><span className="truncate text-sm font-semibold text-ink">{organisation.name}</span><span className="h-7 overflow-hidden rounded-md bg-slate-100"><span className="block h-full rounded-md" style={{ width: `${Math.max(4, organisation.clients / maxClients * 100)}%`, backgroundColor: colours[index % colours.length] }} /></span><span className="text-xs text-slate-600">{organisation.clients} clients · {organisation.users} users</span></button>; })}</div>
        </ChartPanel>

        <ChartPanel title="Operational activity" subtitle="AI notes, documents and invoice lines" icon={ActivityIcon}>
          <ActivityLineChart points={activity} onSelect={(point) => setDetail({ title: formatDate(point.date), value: `${point.ai} AI notes`, comparison: "Aggregate activity for the recorded period", facts: [["Documents", String(point.documents)], ["Invoice lines", String(point.invoices)]], tone: "blue" })} />
        </ChartPanel>

        <ChartPanel title="Security events" subtitle="Recorded access and audit signals" icon={BarChart3}>
          <CategoryBars values={security} onSelect={(item) => setDetail({ title: `${item.label} security events`, value: String(item.value), comparison: "Most recent recorded platform events", facts: [["Scope", "Metadata only"], ["Clinical content", "Not collected"]], tone: item.label === "Critical" ? "red" : item.label === "Warning" ? "amber" : "blue" })} />
        </ChartPanel>

        <ChartPanel title="Support workload" subtitle="Current issue resolution pipeline" icon={BarChart3} className="lg:col-span-2">
          <CategoryBars values={support} onSelect={(item) => setDetail({ title: `${item.label} support cases`, value: String(item.value), comparison: "Customer-reported operational issues", facts: [["Queue", item.label], ["Total cases", String(supportCases.length)]], tone: item.label === "Resolved" || item.label === "Closed" ? "green" : "amber" })} />
        </ChartPanel>

        <NdisMatchQualityPanel events={ndisMatchEvents} onSelect={setDetail} />
      </div>

      <aside className="xl:sticky xl:top-36 xl:self-start" aria-live="polite"><Card className="border-teal-200"><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Selected detail</p><h3 className="mt-2 text-xl font-bold text-ink">{detail.title}</h3><p className="mt-4 text-3xl font-bold text-ink">{detail.value}</p><p className="mt-2 text-sm leading-6 text-slate-600">{detail.comparison}</p><dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200">{detail.facts.length ? detail.facts.map(([label, value]) => <div key={`${label}-${value}`} className="grid grid-cols-[1fr_auto] gap-3 py-3 text-sm"><dt className="text-slate-600">{label}</dt><dd className="text-right font-semibold text-ink">{value}</dd></div>) : <div className="py-3 text-sm text-slate-600">No records in this selection.</div>}</dl></Card></aside>
    </div>
  </section>;
}

export function NdisMatchQualityPanel({ events, onSelect }: { events: NdisMatchEvent[]; onSelect?: (detail: Detail) => void }) {
  const successes = events.filter((event) => event.outcome === "success");
  const failures = events.filter((event) => event.outcome === "failure");
  const aiMatches = successes.filter((event) => event.match_source === "ai").length;
  const rulesMatches = successes.filter((event) => event.match_source === "rules").length;
  const successRate = Math.round(successes.length / Math.max(1, events.length) * 100);
  const values = [
    { label: "Successful", value: successes.length, colour: "bg-emerald-600" },
    { label: "Failed", value: failures.length, colour: "bg-red-600" }
  ];
  return <ChartPanel title="NDIS invoice matching" subtitle="Code and positive-price application outcomes" icon={BarChart3} className="lg:col-span-2">
    <div className="mb-5 grid gap-3 sm:grid-cols-4">
      <Metric label="Success rate" value={`${successRate}%`} />
      <Metric label="Attempts" value={String(events.length)} />
      <Metric label="AI matched" value={String(aiMatches)} />
      <Metric label="Rules fallback" value={String(rulesMatches)} />
    </div>
    {events.length ? <CategoryBars values={values} onSelect={(item) => onSelect?.({ title: `NDIS matches: ${item.label.toLowerCase()}`, value: String(item.value), comparison: `${successRate}% overall code and price success rate`, facts: [["AI matched", String(aiMatches)], ["Rules fallback", String(rulesMatches)], ["Failed", String(failures.length)]], tone: item.label === "Successful" ? "green" : "red" })} /> : <EmptyChart text="Matching outcomes appear after an invoicing user requests an NDIS recommendation." />}
    <p className="mt-4 text-xs text-slate-500">Success requires an existing catalogue code and a positive price. No client or clinical content is collected.</p>
  </ChartPanel>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p></div>; }

function ChartPanel({ title, subtitle, icon: Icon, className, children }: { title: string; subtitle: string; icon: typeof BarChart3; className?: string; children: React.ReactNode }) { return <div className={cn("min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm", className)}><div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-800"><Icon size={18} /></span><div><h3 className="font-bold text-ink">{title}</h3><p className="mt-1 text-sm text-slate-600">{subtitle}</p></div></div>{children}</div>; }

const ActivityIcon = BarChart3;

function MultiLineChart({ points, onSelect }: { points: Array<{ date: string; organisations: number; users: number; clients: number }>; onSelect: (point: { date: string; organisations: number; users: number; clients: number }) => void }) {
  if (!points.length) return <EmptyChart text="Daily snapshots begin with this deployment." />;
  const max = Math.max(1, ...points.flatMap((point) => [point.organisations, point.users, point.clients]));
  const series = [{ key: "clients" as const, label: "Clients", colour: colours[0] }, { key: "users" as const, label: "Users", colour: colours[1] }, { key: "organisations" as const, label: "Organisations", colour: colours[4] }];
  return <><svg viewBox="0 0 520 210" className="h-auto w-full" role="img" aria-label="Platform growth line chart">{[0, 1, 2, 3, 4].map((line) => <line key={line} x1="36" y1={20 + line * 40} x2="500" y2={20 + line * 40} stroke="#e2e8f0" />)}{series.map((item) => <polyline key={item.key} fill="none" stroke={item.colour} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points.map((point, index) => `${x(index, points.length)},${y(point[item.key], max)}`).join(" ")} />)}{points.map((point, index) => <g key={point.date} tabIndex={0} role="button" aria-label={`${formatDate(point.date)}: ${point.clients} clients, ${point.users} users, ${point.organisations} organisations`} onClick={() => onSelect(point)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(point); }} className="cursor-pointer"><circle cx={x(index, points.length)} cy={y(point.clients, max)} r="8" fill="transparent" /><circle cx={x(index, points.length)} cy={y(point.clients, max)} r="4" fill={colours[0]} /></g>)}</svg><Legend items={series} /></>;
}

function RevenueChart({ months, onSelect }: { months: PaymentMonth[]; onSelect: (month: PaymentMonth) => void }) { if (!months.length) return <EmptyChart text="Revenue appears after Stripe invoices are recorded." />; const max = Math.max(1, ...months.map((item) => item.totalPaidCents)); return <div className="flex h-52 items-end gap-2 border-b border-slate-200 px-1">{months.slice(-12).map((month) => <button key={month.month} type="button" onClick={() => onSelect(month)} className="group flex h-full min-w-0 flex-1 flex-col justify-end" aria-label={`${formatMonth(month.month)}: ${formatAud(month.totalPaidCents)}`}><span className="mb-2 hidden text-[10px] font-semibold text-slate-600 group-hover:block sm:block">{formatAud(month.totalPaidCents)}</span><span className="w-full rounded-t-md bg-teal-700 transition-colors group-hover:bg-sky-600" style={{ height: `${Math.max(4, month.totalPaidCents / max * 100)}%` }} /><span className="mt-2 truncate text-[10px] text-slate-500">{formatMonth(month.month).split(" ")[0]}</span></button>)}</div>; }
function ActivityLineChart({ points, onSelect }: { points: Array<{ date: string; ai: number; documents: number; invoices: number }>; onSelect: (point: { date: string; ai: number; documents: number; invoices: number }) => void }) { if (!points.length) return <EmptyChart text="Activity trends begin with the first daily snapshot." />; const max = Math.max(1, ...points.flatMap((point) => [point.ai, point.documents, point.invoices])); const series = [{ key: "ai" as const, label: "AI notes", colour: colours[0] }, { key: "documents" as const, label: "Documents", colour: colours[1] }, { key: "invoices" as const, label: "Invoice lines", colour: colours[4] }]; return <><svg viewBox="0 0 520 210" className="h-auto w-full" role="img" aria-label="Operational activity line chart">{[0,1,2,3,4].map((line)=><line key={line} x1="36" y1={20+line*40} x2="500" y2={20+line*40} stroke="#e2e8f0"/>)}{series.map((item)=><polyline key={item.key} fill="none" stroke={item.colour} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points.map((point,index)=>`${x(index,points.length)},${y(point[item.key],max)}`).join(" ")}/>)}{points.map((point,index)=><g key={point.date} tabIndex={0} role="button" aria-label={`${formatDate(point.date)}: ${point.ai} AI notes, ${point.documents} documents, ${point.invoices} invoice lines`} onClick={()=>onSelect(point)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" ")onSelect(point)}} className="cursor-pointer"><circle cx={x(index,points.length)} cy={y(point.ai,max)} r="8" fill="transparent"/><circle cx={x(index,points.length)} cy={y(point.ai,max)} r="4" fill={colours[0]}/></g>)}</svg><Legend items={series}/></>; }
function CategoryBars({ values, onSelect }: { values: Array<{ label: string; value: number; colour: string }>; onSelect: (item: { label: string; value: number; colour: string }) => void }) { const max = Math.max(1,...values.map((item)=>item.value)); return <div className="space-y-3">{values.map((item)=><button key={item.label} type="button" onClick={()=>onSelect(item)} className="grid w-full grid-cols-[6rem_1fr_2.5rem] items-center gap-3 text-left text-sm"><span className="truncate text-slate-600">{item.label}</span><span className="h-7 overflow-hidden rounded-md bg-slate-100"><span className={cn("block h-full rounded-md",item.colour)} style={{width:`${Math.max(item.value?6:0,item.value/max*100)}%`}}/></span><strong className="text-right text-ink">{item.value}</strong></button>)}</div>; }
function Donut({ values }: { values: number[] }) { const total = Math.max(1, values.reduce((sum, value) => sum + value, 0)); let cursor = 0; const stops = values.map((value, index) => { const start = cursor; cursor += value / total * 100; return `${colours[index]} ${start}% ${cursor}%`; }); return <div className="relative mx-auto h-32 w-32 rounded-full" style={{ background: `conic-gradient(${stops.join(",")})` }} aria-label={`${values.reduce((sum, value) => sum + value, 0)} organisations by plan`} role="img"><span className="absolute inset-6 grid place-items-center rounded-full bg-white text-xl font-bold text-ink">{values.reduce((sum, value) => sum + value, 0)}</span></div>; }
function Legend({ items }: { items: Array<{ label: string; colour: string }> }) { return <div className="mt-3 flex flex-wrap gap-4">{items.map((item) => <span key={item.label} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.colour }} />{item.label}</span>)}</div>; }
function EmptyChart({ text }: { text: string }) { return <div className="grid h-44 place-items-center rounded-md bg-slate-50 px-5 text-center text-sm font-semibold text-slate-600">{text}</div>; }
function aggregateSnapshots(rows: Snapshot[]) { const map = new Map<string, { date: string; organisations: number; users: number; clients: number }>(); rows.forEach((row) => { const current = map.get(row.snapshot_date) || { date: row.snapshot_date, organisations: 0, users: 0, clients: 0 }; current.organisations += 1; current.users += Number(row.users_count || 0); current.clients += Number(row.clients_count || 0); map.set(row.snapshot_date, current); }); return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30); }
function aggregateActivity(rows: Snapshot[]) { const map = new Map<string,{date:string;ai:number;documents:number;invoices:number}>(); rows.forEach((row)=>{const current=map.get(row.snapshot_date)||{date:row.snapshot_date,ai:0,documents:0,invoices:0};current.ai+=Number(row.ai_notes_count||0);current.documents+=Number(row.documents_count||0);current.invoices+=Number(row.invoice_lines_count||0);map.set(row.snapshot_date,current)});return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);}
function x(index: number, length: number) { return length <= 1 ? 268 : 36 + index / (length - 1) * 464; }
function y(value: number, max: number) { return 180 - value / max * 150; }
function percentage(value: number, total: number) { return `${Math.round(value / Math.max(1, total) * 100)}%`; }
function capitalise(value: string) { return value ? value[0].toUpperCase() + value.slice(1).replaceAll("_", " ") : ""; }
function formatAud(cents: number) { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(cents || 0) / 100); }
function formatMonth(value: string) { return new Date(`${value}-01T00:00:00`).toLocaleDateString("en-AU", { month: "short", year: "numeric" }); }
function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }); }
