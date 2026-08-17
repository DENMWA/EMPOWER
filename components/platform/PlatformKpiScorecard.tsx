"use client";

import { useMemo, useState } from "react";
import { Activity, BadgeDollarSign, CheckCircle2, CreditCard, FileCheck2, Sparkles, Users, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

type Organisation = { id:string;users:number;clients:number };
type Usage = { organisation_id:string;ai_analysed_notes:number;documents_uploaded:number;invoice_lines:number;usage_period_end:string };
type SupportCase = { status:string };
type Payment = { amountDueCents:number;amountPaidCents:number };

export function PlatformKpiScorecard({ organisations, usage, supportCases, payments, payingAccounts, paymentRisk }: { organisations:Organisation[];usage:Usage[];supportCases:SupportCase[];payments:Payment[];payingAccounts:number;paymentRisk:number }) {
  const kpis = useMemo(() => buildKpis({ organisations, usage, supportCases, payments, payingAccounts, paymentRisk }), [organisations, usage, supportCases, payments, payingAccounts, paymentRisk]);
  const [selectedId, setSelectedId] = useState("activation");
  const selected = kpis.find((item) => item.id === selectedId) || kpis[0];
  return <Card className="overflow-hidden p-0">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">EmpowerNotes KPIs</p><h2 className="mt-2 text-xl font-bold text-ink">Platform performance</h2><p className="mt-1 text-sm text-slate-600">Select a metric to see exactly how it is calculated.</p></div>
      <StatusBadge label="Live metadata" tone="green" />
    </div>
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => <KpiButton key={kpi.id} kpi={kpi} active={selected.id === kpi.id} onClick={() => setSelectedId(kpi.id)} />)}
    </div>
    <div className="grid gap-4 border-t border-slate-200 bg-ink px-5 py-5 text-white md:grid-cols-[1fr_auto] md:items-center">
      <div><p className="text-xs font-bold uppercase tracking-wide text-teal-200">{selected.label}</p><p className="mt-2 text-sm leading-6 text-slate-300">{selected.definition}</p><p className="mt-2 text-xs text-slate-400">Formula: {selected.formula}</p></div>
      <div className="min-w-48 rounded-md border border-slate-700 bg-slate-900 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-300">Current</span><strong className="text-2xl">{selected.display}</strong></div><div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400"><span>Internal benchmark</span><span>{selected.target}%</span></div></div>
    </div>
  </Card>;
}

type Kpi = { id:string;label:string;display:string;value:number;target:number;definition:string;formula:string;icon:LucideIcon };
function buildKpis({organisations,usage,supportCases,payments,payingAccounts,paymentRisk}:{organisations:Organisation[];usage:Usage[];supportCases:SupportCase[];payments:Payment[];payingAccounts:number;paymentRisk:number}):Kpi[]{
  const total=organisations.length;
  const latest=new Map<string,Usage>();
  [...usage].sort((a,b)=>b.usage_period_end.localeCompare(a.usage_period_end)).forEach(row=>{if(!latest.has(row.organisation_id))latest.set(row.organisation_id,row);});
  const activated=organisations.filter(org=>org.users>0&&org.clients>0).length;
  const engaged=[...latest.values()].filter(row=>Number(row.ai_analysed_notes)+Number(row.documents_uploaded)+Number(row.invoice_lines)>0).length;
  const aiUsers=[...latest.values()].filter(row=>Number(row.ai_analysed_notes)>0).length;
  const invoiceUsers=[...latest.values()].filter(row=>Number(row.invoice_lines)>0).length;
  const due=payments.reduce((sum,row)=>sum+Number(row.amountDueCents||0),0),paid=payments.reduce((sum,row)=>sum+Number(row.amountPaidCents||0),0);
  const resolved=supportCases.filter(row=>["resolved","closed"].includes(row.status)).length;
  return [
    kpi("activation","Workspace activation",percentage(activated,total),80,"Organisations with at least one user and one client.",`${activated} activated / ${total} organisations`,Users),
    kpi("paying","Paying account rate",percentage(payingAccounts,total),40,"Share of organisations with an active paid subscription.",`${payingAccounts} paying / ${total} organisations`,BadgeDollarSign),
    kpi("engagement","Active product adoption",percentage(engaged,total),70,"Organisations recording AI-note, document or invoice activity in their latest usage period.",`${engaged} active / ${total} organisations`,Activity),
    kpi("ai","AI note adoption",percentage(aiUsers,total),60,"Organisations that used AI-assisted notes in their latest recorded usage period.",`${aiUsers} AI users / ${total} organisations`,Sparkles),
    kpi("invoicing","Invoicing adoption",percentage(invoiceUsers,total),50,"Organisations with invoice-line activity in their latest recorded usage period.",`${invoiceUsers} invoicing / ${total} organisations`,FileCheck2),
    kpi("collection","Payment collection",due?Math.min(100,Math.round(paid/due*100)):0,95,"Amount collected compared with the amount due in the subscription payment ledger.",`${aud(paid)} paid / ${aud(due)} due`,WalletCards),
    kpi("support","Support resolution",percentage(resolved,supportCases.length),85,"Support cases currently resolved or closed.",`${resolved} resolved / ${supportCases.length} cases`,CheckCircle2),
    kpi("risk","Accounts clear of payment risk",percentage(Math.max(0,total-paymentRisk),total),95,"Organisations not currently marked as payment risk.",`${Math.max(0,total-paymentRisk)} clear / ${total} organisations`,CreditCard)
  ];
}
function kpi(id:string,label:string,value:number,target:number,definition:string,formula:string,icon:LucideIcon):Kpi{return{id,label,value,target,display:`${value}%`,definition,formula,icon};}
function percentage(value:number,total:number){return total?Math.round(value/total*100):0;}
function aud(cents:number){return new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:0}).format(cents/100);}
function KpiButton({kpi,active,onClick}:{kpi:Kpi;active:boolean;onClick:()=>void}){const Icon=kpi.icon,healthy=kpi.value>=kpi.target;return <button type="button" onClick={onClick} aria-pressed={active} className={cn("rounded-md border p-4 text-left transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700",active?"border-teal-500 bg-teal-50 shadow-sm":"border-slate-200 bg-white hover:border-teal-300")}><div className="flex items-start justify-between gap-3"><span className={cn("grid h-9 w-9 place-items-center rounded-md",healthy?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-800")}><Icon size={17}/></span><StatusBadge label={healthy?"On track":"Watch"} tone={healthy?"green":"amber"}/></div><p className="mt-4 text-sm font-semibold text-slate-600">{kpi.label}</p><p className="mt-1 text-3xl font-bold text-ink">{kpi.display}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={cn("block h-full rounded-full",healthy?"bg-emerald-600":"bg-amber-500")} style={{width:`${Math.min(100,kpi.value)}%`}}/></div></button>;}
