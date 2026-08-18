"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients } from "@/lib/client-records";
import { acknowledgeHandover, getRecentHandovers, handoversUpdatedEvent, type HandoverEntry } from "@/lib/handover-records";
import { getTenantHouses } from "@/lib/house-records";

export function DashboardHandoverPanel() {
  const [entries, setEntries] = useState<HandoverEntry[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  async function load() {
    setLoading(true);
    const [handovers, clients, houses] = await Promise.all([
      getRecentHandovers(24),
      getTenantClients().catch(() => []),
      getTenantHouses().catch(() => [])
    ]);
    setEntries(handovers);
    setNames(new Map([
      ...houses.map((house) => [house.id, house.name] as const),
      ...clients.map((client) => [client.id, client.name] as const)
    ]));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    window.addEventListener(handoversUpdatedEvent, load);
    return () => window.removeEventListener(handoversUpdatedEvent, load);
  }, []);

  const visibleEntries = useMemo(() => [...entries].sort((left, right) => {
    const priority = { urgent: 0, important: 1, routine: 2 };
    return Number(left.acknowledged) - Number(right.acknowledged)
      || priority[left.priority] - priority[right.priority]
      || right.createdAt.localeCompare(left.createdAt);
  }).slice(0, 5), [entries]);
  const unreadCount = entries.filter((entry) => !entry.acknowledged).length;

  async function markRead(entry: HandoverEntry) {
    setSavingId(entry.id);
    const result = await acknowledgeHandover(entry);
    if (result.saved) setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, acknowledged: true } : item));
    setSavingId("");
  }

  return <aside aria-label="Incoming handover" className="xl:sticky xl:top-4 xl:self-start">
    <Card className="border-teal-200 bg-white shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Incoming shift</p><h2 className="mt-1 text-xl font-bold text-ink">Handover</h2><p className="mt-1 text-sm text-slate-600">Updates from the last 24 hours.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh handover" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-300 bg-white text-slate-700"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
      </div>
      <div className="mt-3 flex gap-2"><StatusBadge label={`${unreadCount} unread`} tone={unreadCount ? "amber" : "green"} /><StatusBadge label={`${entries.length} updates`} tone="blue" /></div>
      <div className="mt-4 space-y-3">
        {!loading && !visibleEntries.length ? <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No handover updates in the last 24 hours.</p> : null}
        {visibleEntries.map((entry) => <article key={entry.id} className={`rounded-md border p-3 ${entry.acknowledged ? "border-slate-200 bg-slate-50/60" : entry.priority === "urgent" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50/60"}`}>
          <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-ink">{names.get(entry.participantId) || names.get(entry.houseId) || "House update"}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-AU")} · {entry.category.replaceAll("_", " ")}</p></div><StatusBadge label={entry.priority} tone={entry.priority === "urgent" ? "red" : entry.priority === "important" ? "amber" : "blue"} /></div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{entry.summary}</p>
          {entry.followUpAction ? <p className="mt-2 text-sm font-medium text-amber-900"><span className="font-bold">Follow-up:</span> {entry.followUpAction}</p> : null}
          {!entry.acknowledged ? <button type="button" disabled={savingId === entry.id} onClick={() => void markRead(entry)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:bg-slate-400"><Check size={16} />{savingId === entry.id ? "Saving..." : "Mark as read"}</button> : <p className="mt-3 text-xs font-semibold text-slate-500">Read</p>}
        </article>)}
      </div>
      <Link href="/handover" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-teal-300 bg-teal-50 px-4 text-sm font-semibold text-teal-900">Open communication book <ArrowRight size={16} /></Link>
    </Card>
  </aside>;
}
