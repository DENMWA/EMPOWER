"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, ClipboardList, Search } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { getTenantDocumentDownloadUrl } from "@/lib/document-records";

export function ProgressNoteLog() {
  const [records, setRecords] = useState<RetainedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openRecordId, setOpenRecordId] = useState("");

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      const saved = await getTenantRetainedRecords("progress-note").catch(() => []);
      setRecords(saved);
      setLoading(false);
    }

    void loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return records;
    return records.filter((record) => `${record.title}\n${record.body}`.toLowerCase().includes(search));
  }, [query, records]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Shared organisation log</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Saved progress notes</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Authorised staff can find and open progress notes retained in this organisation&apos;s workspace.</p>
        </div>
        <StatusBadge label={`${records.length} saved`} tone="blue" />
      </div>

      <label className="relative block max-w-xl">
        <span className="sr-only">Search saved progress notes</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by client, house, support type or date"
          className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-ink shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredRecords.map((record) => {
          const client = extractField(record.body, "Client") || "Client not recorded";
          const house = extractField(record.body, "House/service") || "Service not recorded";
          const supportType = extractField(record.body, "Support type") || "Progress note";
          const supportDate = extractField(record.body, "Date") || new Date(record.savedAt).toLocaleDateString("en-AU");
          const supportTime = extractField(record.body, "Time");
          const isOpen = openRecordId === record.id;
          const photoPaths = extractPhotoPaths(record.body);

          return (
            <Card key={record.id} className="border-l-4 border-l-teal-600">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">{supportType}</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{client}</h3>
                  <p className="mt-1 text-sm text-slate-600">{house}</p>
                </div>
                <StatusBadge label={supportDate} tone="slate" />
              </div>
              <PrivateEvidencePhotos pathKey={photoPaths.join("|")} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-500">{supportTime || `Saved ${new Date(record.savedAt).toLocaleString("en-AU")}`}</p>
                <button
                  type="button"
                  onClick={() => setOpenRecordId(isOpen ? "" : record.id)}
                  aria-expanded={isOpen}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink hover:border-teal-400 hover:bg-teal-50"
                >
                  {isOpen ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
                  {isOpen ? "Close note" : "Open note"}
                </button>
              </div>
              {isOpen ? (
                <pre className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-800">{record.body.replace(/\n\nPhoto evidence:[\s\S]*$/, "")}</pre>
              ) : null}
            </Card>
          );
        })}
      </div>

      {!loading && !filteredRecords.length ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <ClipboardList size={24} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">{records.length ? "No notes match this search" : "No progress notes saved yet"}</p>
          <p className="mt-1 text-sm text-slate-600">Saved notes will appear here automatically.</p>
        </div>
      ) : null}
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading saved progress notes...</p> : null}
    </div>
  );
}

function PrivateEvidencePhotos({ pathKey }: { pathKey: string }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all(pathKey.split("|").filter(Boolean).map((path) => getTenantDocumentDownloadUrl(path))).then((results) => {
      if (active) setUrls(results.map((result) => result.url).filter(Boolean));
    });
    return () => { active = false; };
  }, [pathKey]);

  if (!urls.length) return null;
  return <div className="mt-4 flex flex-wrap gap-3">{urls.map((url) => <Image key={url} src={url} alt="Shift note evidence" width={144} height={108} unoptimized className="h-24 w-32 rounded-md border border-slate-200 object-cover" />)}</div>;
}

function extractPhotoPaths(body: string) {
  const section = body.split("Photo evidence:")[1] || "";
  return section.split("\n").map((line) => line.replace(/^\s*-\s*/, "").trim()).filter(Boolean);
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}
