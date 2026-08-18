"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Home, RefreshCw, UserRound } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, type HouseRecord } from "@/lib/house-records";
import { acknowledgeHandover, createHandoverEntry, getRecentHandovers, handoversUpdatedEvent, type HandoverEntry, type HandoverScope } from "@/lib/handover-records";

const categories = ["participant_update", "incident_follow_up", "appointment", "food_fluid", "operational", "other"];
const scopes: Array<{ value: HandoverScope; label: string; detail: string; icon: typeof Home }> = [
  { value: "house", label: "House/service", detail: "Residential or location-based handover", icon: Home },
  { value: "client", label: "Client", detail: "In-home, community or individual support", icon: UserRound },
  { value: "organisation", label: "Organisation", detail: "Non-clinical operational notice", icon: Building2 }
];

export function HandoverWorkspace() {
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [entries, setEntries] = useState<HandoverEntry[]>([]);
  const [scopeType, setScopeType] = useState<HandoverScope>("client");
  const [houseId, setHouseId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState<HandoverEntry["priority"]>("routine");
  const [summary, setSummary] = useState("");
  const [followUpAction, setFollowUpAction] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [nextHouses, nextClients, nextEntries] = await Promise.all([getTenantHouses(), getTenantClients(), getRecentHandovers(24)]);
    setHouses(nextHouses);
    setClients(nextClients);
    setEntries(nextEntries);
  }

  useEffect(() => {
    void load();
    window.addEventListener(handoversUpdatedEvent, load);
    return () => window.removeEventListener(handoversUpdatedEvent, load);
  }, []);

  const houseClients = useMemo(() => clients.filter((client) => !houseId || houses.find((house) => house.id === houseId)?.clientIds.includes(client.id) || client.primaryHouseId === houseId), [clients, houseId, houses]);

  async function save() {
    if (!summary.trim()) return setMessage("Enter the handover update.");
    if (scopeType === "house" && !houseId) return setMessage("Choose the house or service for this handover.");
    if (scopeType === "client" && !participantId) return setMessage("Choose the client for this handover.");
    const result = await createHandoverEntry({ scopeType, houseId, participantId, category, priority, summary: summary.trim(), followUpAction: followUpAction.trim() });
    setMessage(result.savedToCloud ? "Handover saved to the workspace." : result.error);
    if (result.saved) { setSummary(""); setFollowUpAction(""); await load(); }
  }

  return <div className="space-y-6">
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Communication book</p><h2 className="mt-1 text-xl font-semibold text-ink">Add handover</h2><p className="mt-2 text-sm text-slate-600">Share a concise update with the next team.</p></div>
        <StatusBadge label="Access scoped" tone="green" />
      </div>
      <fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-700">Handover for</legend><div className="mt-3 grid gap-3 md:grid-cols-3">{scopes.map((scope) => { const Icon = scope.icon; return <label key={scope.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${scopeType === scope.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}><input type="radio" name="handover-scope" className="sr-only" checked={scopeType === scope.value} onChange={() => { setScopeType(scope.value); setHouseId(""); setParticipantId(""); if (scope.value === "organisation") setCategory("operational"); }} /><Icon size={19} className="mt-0.5 text-teal-700" /><span><span className="block text-sm font-semibold text-ink">{scope.label}</span><span className="mt-1 block text-xs text-slate-600">{scope.detail}</span></span></label>; })}</div></fieldset>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {scopeType === "house" ? <label className="text-sm font-semibold text-slate-700">House/service<select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3" value={houseId} onChange={(event) => setHouseId(event.target.value)}><option value="">Select house/service</option>{houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label> : null}
        {scopeType === "client" ? <label className="text-sm font-semibold text-slate-700">Client<select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3" value={participantId} onChange={(event) => setParticipantId(event.target.value)}><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label> : null}
        {scopeType !== "organisation" ? <label className="text-sm font-semibold text-slate-700">Category<select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label> : <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Operational notice only. Do not include client information.</div>}
        <label className="text-sm font-semibold text-slate-700">Priority<select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3" value={priority} onChange={(event) => setPriority(event.target.value as HandoverEntry["priority"])}><option>routine</option><option>important</option><option>urgent</option></select></label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">Update<textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 p-3" value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      <label className="mt-3 block text-sm font-semibold text-slate-700">Follow-up action, if required<input className="mt-2 w-full rounded-md border border-slate-300 p-3" value={followUpAction} onChange={(event) => setFollowUpAction(event.target.value)} /></label>
      <button type="button" onClick={() => void save()} className="mt-4 min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-white">Save handover</button>
      {message ? <p aria-live="polite" className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
    </Card>
    <Card>
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Incoming shift</p><h2 className="mt-1 text-xl font-semibold text-ink">Last 24 hours</h2></div><button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300" aria-label="Refresh handover"><RefreshCw size={18} /></button></div>
      <div className="mt-4 space-y-3">{!entries.length ? <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">No handover entries in the last 24 hours.</p> : entries.map((entry) => { const client = clients.find((item) => item.id === entry.participantId); const house = houses.find((item) => item.id === entry.houseId); const title = entry.scopeType === "organisation" ? "Organisation notice" : client?.name || house?.name || "Service handover"; return <article key={entry.id} className="rounded-md border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold text-ink">{title}</p><p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-AU")} | {entry.category.replaceAll("_", " ")}</p></div><StatusBadge label={entry.priority} tone={entry.priority === "urgent" ? "red" : entry.priority === "important" ? "amber" : "blue"} /></div><p className="mt-3 text-sm leading-6 text-slate-700">{entry.summary}</p>{entry.followUpAction ? <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>Follow-up:</strong> {entry.followUpAction}</p> : null}<button disabled={entry.acknowledged} type="button" onClick={async () => { await acknowledgeHandover(entry); await load(); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:bg-slate-300"><Check size={16} />{entry.acknowledged ? "Read" : "Mark as read"}</button></article>; })}</div>
    </Card>
  </div>;
}
