"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp, ClipboardList, Pencil, Search, X } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients } from "@/lib/client-records";
import { getTenantDocumentPreviewUrl } from "@/lib/document-records";
import { getTenantWorkerProgressNotes, updateOwnProgressNote, type WorkerProgressNote } from "@/lib/progress-note-records";

export function ProgressNoteLog() {
  const [records, setRecords] = useState<WorkerProgressNote[]>([]);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openRecordId, setOpenRecordId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRecords() {
    setLoading(true);
    const [saved, clients] = await Promise.all([getTenantWorkerProgressNotes(), getTenantClients().catch(() => [])]);
    setRecords(saved.records);
    setClientNames(new Map(clients.map((client) => [client.id, client.name])));
    setLoading(false);
  }

  useEffect(() => {
    void loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return records;
    return records.filter((record) => `${clientNames.get(record.participantId) || ""}\n${record.supportType}\n${record.body}`.toLowerCase().includes(search));
  }, [clientNames, query, records]);

  async function saveEdit(record: WorkerProgressNote) {
    if (!editBody.trim()) return setMessage("Enter the progress note before saving.");
    setSaving(true);
    const result = await updateOwnProgressNote(record.id, editBody);
    setSaving(false);
    if (!result.saved) return setMessage(result.error || "The progress note was not updated.");
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, body: editBody.trim(), updatedAt: new Date().toISOString() } : item));
    setEditingId("");
    setMessage("Progress note updated.");
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Shared organisation log</p><h2 className="mt-2 text-2xl font-bold text-ink">Saved progress notes</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Open saved notes or update your own record before approval.</p></div><StatusBadge label={`${records.length} saved`} tone="blue" /></div>
    {message ? <p role="status" className="rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">{message}</p> : null}
    <label className="relative block max-w-xl"><span className="sr-only">Search saved progress notes</span><Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by client, support type or note" className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-ink shadow-sm" /></label>
    <div className="grid gap-4 lg:grid-cols-2">{filteredRecords.map((record) => {
      const isOpen = openRecordId === record.id;
      const isEditing = editingId === record.id;
      const canEdit = record.isOwn && record.status !== "Approved" && record.status !== "Locked";
      return <Card key={record.id} className="border-l-4 border-l-teal-600">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">{record.supportType}</p><h3 className="mt-1 text-lg font-bold text-ink">{clientNames.get(record.participantId) || "Client"}</h3><p className="mt-1 text-sm text-slate-600">{record.supportDate}{record.startTime ? ` · ${record.startTime}${record.endTime ? `-${record.endTime}` : ""}` : ""}</p></div>{record.status !== "Approved" ? <StatusBadge label={record.status} tone={record.status === "Locked" ? "slate" : "amber"} /> : null}</div>
        <PrivateEvidencePhotos pathKey={record.photoPaths.join("|")} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs font-medium text-slate-500">Updated {new Date(record.updatedAt).toLocaleString("en-AU")}</p><div className="flex flex-wrap gap-2">{canEdit ? <button type="button" onClick={() => { setEditingId(record.id); setOpenRecordId(record.id); setEditBody(record.body); setMessage(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink"><Pencil size={16} />Edit</button> : null}<button type="button" onClick={() => setOpenRecordId(isOpen ? "" : record.id)} aria-expanded={isOpen} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink">{isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}{isOpen ? "Close note" : "Open note"}</button></div></div>
        {isOpen ? isEditing ? <div className="mt-4"><label className="text-sm font-semibold text-slate-700">Progress note<textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={9} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-sm leading-7 text-ink" /></label><div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void saveEdit(record)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sea px-3 text-sm font-semibold text-white"><Check size={16} />{saving ? "Saving..." : "Save changes"}</button><button type="button" onClick={() => setEditingId("")} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink"><X size={16} />Cancel</button></div></div> : <div><p className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-7 text-slate-800">{record.body}</p>{record.status === "Approved" ? <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">Approved progress note. This record is read-only.</p> : null}</div> : null}
      </Card>;
    })}</div>
    {!loading && !filteredRecords.length ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><ClipboardList size={24} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-ink">{records.length ? "No notes match this search" : "No progress notes saved yet"}</p></div> : null}
    {loading ? <p className="text-sm font-semibold text-slate-500">Loading saved progress notes...</p> : null}
  </div>;
}

function PrivateEvidencePhotos({ pathKey }: { pathKey: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { let active = true; let previews: string[] = []; setUrls([]); Promise.all(pathKey.split("|").filter(Boolean).map((path) => getTenantDocumentPreviewUrl(path))).then((results) => { previews = results.map((result) => result.url).filter(Boolean); if (active) setUrls(previews); }); return () => { active = false; previews.forEach((url) => URL.revokeObjectURL(url)); }; }, [pathKey]);
  if (!urls.length) return null;
  return <div className="mt-4 flex flex-wrap gap-3">{urls.map((url) => <Image key={url} src={url} alt="Shift note evidence" width={144} height={108} unoptimized className="h-24 w-32 rounded-md border border-slate-200 object-cover" />)}</div>;
}
