"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardPlus, FileWarning, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getHousesForClient, getTenantHouses, type HouseRecord } from "@/lib/house-records";
import { getRestrictivePracticeAuthorisations, getRestrictivePracticeUses, saveRestrictivePracticeAuthorisation, saveRestrictivePracticeUse, type RestrictivePracticeAuthorisation, type RestrictivePracticeType, type RestrictivePracticeUse } from "@/lib/restrictive-practice-records";

type View = "authorisations" | "uses" | "monthly";
const today = () => new Date().toISOString().slice(0, 10);
const localNow = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const uid = () => globalThis.crypto?.randomUUID?.() || `rp-${Date.now()}`;
const practiceGuides: ReadonlyArray<{ type: RestrictivePracticeType; guide: string }> = [
  { type: "Seclusion", guide: "The person is alone in a room or area and is not free to leave." },
  { type: "Chemical restraint", guide: "Medication is used primarily to influence behaviour, rather than to treat a diagnosed condition." },
  { type: "Mechanical restraint", guide: "A device is used to prevent, restrict, or limit a person's movement for behaviour control." },
  { type: "Physical restraint", guide: "Physical force is used to prevent, restrict, or subdue a person's movement." },
  { type: "Environmental restraint", guide: "Access to a place, item, or activity is restricted beyond ordinary safety arrangements." }
];

function expiryTone(expiresOn: string) {
  if (!expiresOn) return { label: "Expiry required", tone: "red" as const };
  const days = Math.ceil((new Date(`${expiresOn}T23:59:59`).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", tone: "red" as const };
  if (days <= 14) return { label: `${days} days remaining`, tone: "red" as const };
  if (days <= 30) return { label: `${days} days remaining`, tone: "amber" as const };
  return { label: "Active", tone: "green" as const };
}

export function RestrictivePracticeWorkspace() {
  const [view, setView] = useState<View>("authorisations");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [authorisations, setAuthorisations] = useState<RestrictivePracticeAuthorisation[]>([]);
  const [uses, setUses] = useState<RestrictivePracticeUse[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [clientRows, houseRows, authorisationRows, useRows] = await Promise.all([getTenantClients(), getTenantHouses(), getRestrictivePracticeAuthorisations(), getRestrictivePracticeUses()]);
    setClients(clientRows); setHouses(houseRows); setAuthorisations(authorisationRows); setUses(useRows);
  }
  useEffect(() => { void load(); }, []);

  return <div className="space-y-5">
    <div className="flex gap-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Restrictive practice reporting views">
      {([['authorisations','Authorisations',ShieldCheck],['uses','Use log',ClipboardPlus],['monthly','Monthly reporting',CalendarClock]] as const).map(([key,label,Icon]) => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-semibold ${view === key ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-ink"}`}><Icon size={17} aria-hidden="true" />{label}</button>)}
    </div>
    {message ? <p className="rounded-md border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-teal-900" role="status">{message}</p> : null}
    {view === "authorisations" ? <Authorisations clients={clients} houses={houses} records={authorisations} onSaved={async (text) => { setMessage(text); await load(); }} /> : null}
    {view === "uses" ? <UseLog clients={clients} houses={houses} authorisations={authorisations} uses={uses} onSaved={async (text) => { setMessage(text); await load(); }} /> : null}
    {view === "monthly" ? <MonthlyReporting clients={clients} authorisations={authorisations} uses={uses} /> : null}
  </div>;
}

function Authorisations({ clients, houses, records, onSaved }: { clients: ClientRecord[]; houses: HouseRecord[]; records: RestrictivePracticeAuthorisation[]; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<RestrictivePracticeAuthorisation>({ id: uid(), participantId: "", houseId: "", practiceType: "Environmental restraint", practiceName: "", behaviourSupportPlan: "", authorisingBody: "", authorisationReference: "", startsOn: today(), expiresOn: "", conditions: "", maximumDurationMinutes: null, maximumFrequency: "", approvalStatus: "Approved", status: "Active" });
  const client = clients.find((item) => item.id === form.participantId);
  const availableHouses = client ? getHousesForClient(houses, client) : [];
  const update = <K extends keyof RestrictivePracticeAuthorisation>(key: K, value: RestrictivePracticeAuthorisation[K]) => setForm((current) => ({ ...current, [key]: value }));
  async function save() {
    if (!form.participantId || !form.practiceName || !form.expiresOn || (form.approvalStatus === "Approved" && !form.authorisationReference)) return onSaved("Complete the client, practice, expiry date, and approval reference where approved.");
    const result = await saveRestrictivePracticeAuthorisation(form);
    if (!result.saved) return onSaved(`Authorisation was not saved. ${result.error || "Try again."}`);
    setForm((current) => ({ ...current, id: uid(), practiceName: "", authorisationReference: "", conditions: "" })); onSaved("Authorisation saved securely.");
  }
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
    <Card><h2 className="text-xl font-bold text-ink">Add authorisation</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Select label="Client" value={form.participantId} onChange={(value) => { update("participantId", value); update("houseId", ""); }} options={clients.map((item) => [item.id,item.name])} placeholder="Choose client" />
      <Select label="House / service" value={form.houseId} onChange={(value) => update("houseId", value)} options={availableHouses.map((item) => [item.id,item.name])} placeholder="Choose service" />
      <Select label="Approval" value={form.approvalStatus} onChange={(value) => update("approvalStatus", value as RestrictivePracticeAuthorisation["approvalStatus"])} options={[["Approved","Approved"],["Unapproved","Unapproved"]]} />
      <Input label="Authorised practice" value={form.practiceName} onChange={(value) => update("practiceName", value)} />
      <Input label="Behaviour Support Plan" value={form.behaviourSupportPlan} onChange={(value) => update("behaviourSupportPlan", value)} />
      <Input label="Authorising body" value={form.authorisingBody} onChange={(value) => update("authorisingBody", value)} />
      <Input label={form.approvalStatus === "Approved" ? "Authorisation reference" : "Reference, if available"} value={form.authorisationReference} onChange={(value) => update("authorisationReference", value)} />
      <Input label="Maximum frequency" value={form.maximumFrequency} onChange={(value) => update("maximumFrequency", value)} />
      <Input label="Start date" type="date" value={form.startsOn} onChange={(value) => update("startsOn", value)} />
      <Input label="Expiry date" type="date" value={form.expiresOn} onChange={(value) => update("expiresOn", value)} />
      <Input label="Maximum duration (minutes)" type="number" value={form.maximumDurationMinutes?.toString() || ""} onChange={(value) => update("maximumDurationMinutes", value ? Number(value) : null)} />
      <Select label="Status" value={form.status} onChange={(value) => update("status", value as RestrictivePracticeAuthorisation["status"])} options={[["Active","Active"],["Suspended","Suspended"],["Expired","Expired"]]} />
    </div><PracticeGuideCards value={form.practiceType} onChange={(value) => update("practiceType", value)} /><TextArea label="Conditions and permitted circumstances" value={form.conditions} onChange={(value) => update("conditions", value)} /><button type="button" onClick={() => void save()} className="mt-4 min-h-11 rounded-md bg-sea px-4 text-sm font-semibold text-white">Save authorisation</button></Card>
    <Card><h2 className="text-xl font-bold text-ink">Current register</h2><div className="mt-4 space-y-3">{records.length ? records.map((record) => { const expiry = expiryTone(record.expiresOn); return <div key={record.id} className="rounded-md border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-ink">{clients.find((item) => item.id === record.participantId)?.name || "Client"}</p><p className="mt-1 text-sm text-slate-600">{record.practiceType} · {record.practiceName}</p></div><div className="flex flex-wrap justify-end gap-2"><StatusBadge label={record.approvalStatus} tone={record.approvalStatus === "Approved" ? "green" : "red"} /><StatusBadge label={record.status === "Active" ? expiry.label : record.status} tone={record.status === "Active" ? expiry.tone : "red"} /></div></div><p className="mt-3 text-sm text-slate-600">Expires {record.expiresOn || "not recorded"} · Ref {record.authorisationReference || "not available"}</p></div>; }) : <Empty text="No authorisations recorded." />}</div></Card>
  </div>;
}

function UseLog({ clients, houses, authorisations, uses, onSaved }: { clients: ClientRecord[]; houses: HouseRecord[]; authorisations: RestrictivePracticeAuthorisation[]; uses: RestrictivePracticeUse[]; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<RestrictivePracticeUse>({ id: uid(), authorisationId: "", participantId: "", houseId: "", practiceType: "Environmental restraint", usedAt: localNow(), endedAt: "", triggerContext: "", alternativesAttempted: "", implementation: "", participantResponse: "", monitoring: "", recoverySupport: "", injuryOrHarm: false, injurySummary: "", approvalStatus: "Approved", matchedAuthorisation: true, varianceDetails: "", staffNames: "", notifications: "", status: "Draft" });
  const client = clients.find((item) => item.id === form.participantId);
  const availableAuthorisations = authorisations.filter((item) => item.participantId === form.participantId && item.status === "Active" && item.approvalStatus === "Approved");
  const availableHouses = client ? getHousesForClient(houses, client) : [];
  const update = <K extends keyof RestrictivePracticeUse>(key: K, value: RestrictivePracticeUse[K]) => setForm((current) => ({ ...current, [key]: value }));
  async function save(status: RestrictivePracticeUse["status"]) { if (!form.participantId || !form.usedAt || !form.implementation) return onSaved("Choose the client and record what was implemented."); if ((form.approvalStatus === "Unapproved" || !form.matchedAuthorisation) && !form.varianceDetails.trim()) return onSaved("Explain the unapproved use or variance before saving."); const result = await saveRestrictivePracticeUse({ ...form, status }); if (!result.saved) return onSaved(`Use record was not saved. ${result.error || "Try again."}`); onSaved(status === "Submitted" ? "Use record submitted for review." : "Draft saved."); }
  const escalation = form.injuryOrHarm || form.approvalStatus === "Unapproved" || !form.matchedAuthorisation || !form.authorisationId;
  function incidentHref(record: RestrictivePracticeUse) { const params = new URLSearchParams({ rpUseId: record.id, participantId: record.participantId, houseId: record.houseId, injury: record.injurySummary, details: `${record.implementation}\n\nContext: ${record.triggerContext}\n\nVariance: ${record.varianceDetails}` }); return `/incidents/new?${params}`; }
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]"><Card><h2 className="text-xl font-bold text-ink">Record a use</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
    <Select label="Client" value={form.participantId} onChange={(value) => setForm((current) => ({ ...current, participantId: value, houseId: "", authorisationId: "" }))} options={clients.map((item) => [item.id,item.name])} placeholder="Choose client" />
    <Select label="House / service" value={form.houseId} onChange={(value) => update("houseId", value)} options={availableHouses.map((item) => [item.id,item.name])} placeholder="Choose service" />
    <Select label="Authorisation" value={form.authorisationId} onChange={(value) => { const selected = availableAuthorisations.find((item) => item.id === value); setForm((current) => ({ ...current, authorisationId: value, practiceType: selected?.practiceType || current.practiceType, approvalStatus: value ? "Approved" : current.approvalStatus, matchedAuthorisation: value ? true : current.matchedAuthorisation })); }} options={availableAuthorisations.map((item) => [item.id,`${item.practiceType}: ${item.practiceName}`])} placeholder="No matching authorisation" />
    <Select label="Use classification" value={form.approvalStatus} onChange={(value) => { update("approvalStatus", value as RestrictivePracticeUse["approvalStatus"]); if (value === "Unapproved") update("matchedAuthorisation", false); }} options={[["Approved","Approved"],["Unapproved","Unapproved"]]} />
    <Input label="Staff involved" value={form.staffNames} onChange={(value) => update("staffNames", value)} />
    <Input label="Started" type="datetime-local" value={form.usedAt} onChange={(value) => update("usedAt", value)} />
    <Input label="Ended" type="datetime-local" value={form.endedAt} onChange={(value) => update("endedAt", value)} />
  </div><PracticeGuideCards value={form.practiceType} onChange={(value) => update("practiceType", value)} /><TextArea label="Trigger and context" value={form.triggerContext} onChange={(value) => update("triggerContext", value)} /><TextArea label="Alternatives attempted first" value={form.alternativesAttempted} onChange={(value) => update("alternativesAttempted", value)} /><TextArea label="What was implemented" value={form.implementation} onChange={(value) => update("implementation", value)} /><TextArea label="Participant response and monitoring" value={`${form.participantResponse}${form.monitoring ? `\n${form.monitoring}` : ""}`} onChange={(value) => update("participantResponse", value)} />
  <div className="mt-4 grid gap-3 sm:grid-cols-2"><Check label="Matched the plan and authorisation" checked={form.matchedAuthorisation} onChange={(value) => update("matchedAuthorisation", value)} /><Check label="Injury or harm occurred" checked={form.injuryOrHarm} onChange={(value) => update("injuryOrHarm", value)} /></div>
  {form.approvalStatus === "Unapproved" || !form.matchedAuthorisation ? <TextArea label="Unapproved use or variance details" value={form.varianceDetails} onChange={(value) => update("varianceDetails", value)} /> : null}{form.injuryOrHarm ? <TextArea label="Injury or harm details" value={form.injurySummary} onChange={(value) => update("injurySummary", value)} /> : null}
  {escalation ? <div className="mt-4 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"><AlertTriangle className="shrink-0" size={19} /><p><strong>Manager review required.</strong> Missing authorisation, variance, or harm may also require a linked incident assessment.</p></div> : null}
  <div className="mt-4 flex gap-2"><button type="button" onClick={() => void save("Draft")} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold">Save draft</button><button type="button" onClick={() => void save("Submitted")} className="min-h-11 rounded-md bg-sea px-4 text-sm font-semibold text-white">Submit</button></div></Card>
  <Card><h2 className="text-xl font-bold text-ink">Use log</h2><div className="mt-4 space-y-3">{uses.length ? uses.map((record) => { const needsIncident = record.injuryOrHarm || record.approvalStatus === "Unapproved" || !record.matchedAuthorisation || !record.authorisationId; return <div key={record.id} className="rounded-md border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-ink">{clients.find((item) => item.id === record.participantId)?.name || "Client"}</p><p className="mt-1 text-sm text-slate-600">{new Date(record.usedAt).toLocaleString("en-AU")}</p></div><div className="flex flex-wrap justify-end gap-2"><StatusBadge label={record.approvalStatus} tone={record.approvalStatus === "Approved" ? "green" : "red"} /><StatusBadge label={record.status} tone={record.status === "Reviewed" ? "green" : "amber"} /></div></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">{record.implementation}</p>{needsIncident && !record.linkedIncidentId ? <Link href={incidentHref(record)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800"><FileWarning size={16} />Create linked incident</Link> : null}</div>; }) : <Empty text="No use records submitted." />}</div></Card></div>;
}

function MonthlyReporting({ clients, authorisations, uses }: { clients: ClientRecord[]; authorisations: RestrictivePracticeAuthorisation[]; uses: RestrictivePracticeUse[] }) {
  const [month, setMonth] = useState(today().slice(0,7));
  const rows = useMemo(() => authorisations.filter((item) => item.status === "Active").map((item) => ({ item, uses: uses.filter((entry) => entry.authorisationId === item.id && entry.usedAt.startsWith(month)) })), [authorisations, uses, month]);
  return <Card><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-ink">Monthly reporting ledger</h2><p className="mt-1 text-sm text-slate-600">Review every active practice, including nil use.</p></div><Input label="Reporting month" type="month" value={month} onChange={setMonth} /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-600"><th className="py-3 pr-4">Client</th><th className="py-3 pr-4">Practice</th><th className="py-3 pr-4">Uses</th><th className="py-3 pr-4">Total duration</th><th className="py-3">Status</th></tr></thead><tbody>{rows.map(({item,uses: monthlyUses}) => { const minutes = monthlyUses.reduce((sum, use) => sum + Math.max(0,(new Date(use.endedAt).getTime()-new Date(use.usedAt).getTime())/60000 || 0),0); return <tr key={item.id} className="border-b border-slate-100"><td className="py-4 pr-4 font-semibold text-ink">{clients.find((client) => client.id === item.participantId)?.name || "Client"}</td><td className="py-4 pr-4">{item.practiceName}</td><td className="py-4 pr-4">{monthlyUses.length}</td><td className="py-4 pr-4">{Math.round(minutes)} min</td><td className="py-4"><StatusBadge label={monthlyUses.length ? "Usage recorded" : "Nil use"} tone={monthlyUses.length ? "blue" : "slate"} /></td></tr>; })}</tbody></table>{!rows.length ? <Empty text="No active authorisations for this reporting month." /> : null}</div><div className="mt-4 flex gap-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950"><CheckCircle2 size={18} className="shrink-0" /><p>This ledger prepares the figures for authorised review. Submission to the NDIS Commission remains a separate authorised officer action.</p></div></Card>;
}

function Input({ label, value, onChange, type="text" }: { label:string; value:string; onChange:(value:string)=>void; type?:string }) { return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}<input type={type} value={value} onChange={(event)=>onChange(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-ink" /></label>; }
function Select({ label, value, onChange, options, placeholder }: { label:string; value:string; onChange:(value:string)=>void; options:readonly (readonly [string,string])[]; placeholder?:string }) { return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event)=>onChange(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-ink">{placeholder ? <option value="">{placeholder}</option> : null}{options.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>; }
function TextArea({ label, value, onChange }: { label:string; value:string; onChange:(value:string)=>void }) { return <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">{label}<textarea rows={3} value={value} onChange={(event)=>onChange(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 leading-6 text-ink" /></label>; }
function Check({ label, checked, onChange }: { label:string; checked:boolean; onChange:(value:boolean)=>void }) { return <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)} />{label}</label>; }
function Empty({ text }: { text:string }) { return <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">{text}</p>; }

function PracticeGuideCards({ value, onChange }: { value: RestrictivePracticeType; onChange: (value: RestrictivePracticeType) => void }) {
  return <fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-700">Restrictive practice type</legend><p className="mt-1 text-xs text-slate-500">Guidance only. This explanation is not added to the saved record.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{practiceGuides.map((item) => { const selected = item.type === value; return <button key={item.type} type="button" aria-pressed={selected} onClick={() => onChange(item.type)} className={`min-h-28 rounded-md border p-3 text-left focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${selected ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className="flex items-center gap-2 font-semibold text-ink"><span className={`h-3 w-3 rounded-full border ${selected ? "border-teal-700 bg-teal-700" : "border-slate-400 bg-white"}`} aria-hidden="true" />{item.type}</span><span className="mt-2 block text-sm font-normal leading-5 text-slate-600">{item.guide}</span></button>; })}</div></fieldset>;
}
