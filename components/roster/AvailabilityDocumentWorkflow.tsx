"use client";

import { useState } from "react";
import { Check, Download, FileUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { saveStaffAvailability } from "@/lib/roster-intelligence-cloud";
import type { AvailabilityKind, StaffAvailability } from "@/lib/roster-intelligence";
import { getStoredAccessToken } from "@/lib/supabase-rest";

type ProposedLine = { id: string; weekday: number; day: string; startTime: string; endTime: string; kind: AvailabilityKind; notes: string };

export function AvailabilityDocumentWorkflow({ staffInviteId, staffName, onPublished }: { staffInviteId: string; staffName: string; onPublished: (records: StaffAvailability[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [lines, setLines] = useState<ProposedLine[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function downloadTemplate() {
    if (!staffInviteId) return setMessage("Choose a staff member first.");
    setBusy("download");
    const response = await fetch("/api/roster/availability-form", { method: "POST", headers: authHeaders(), body: JSON.stringify({ staffInviteId }) });
    if (!response.ok) return finishError(response, "The PDF could not be generated.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${staffName || "employee"}-availability.pdf`; link.click();
    URL.revokeObjectURL(url); setBusy(""); setMessage("Availability PDF downloaded.");
  }

  async function parseForm() {
    if (!file || !staffInviteId) return setMessage("Choose staff and upload the completed PDF.");
    setBusy("parse"); setConfirmed(false);
    const body = new FormData(); body.append("file", file); body.append("staffInviteId", staffInviteId);
    const response = await fetch("/api/roster/availability-parse", { method: "POST", headers: { Authorization: `Bearer ${getStoredAccessToken() || ""}` }, body });
    const result = await response.json() as { lines?: ProposedLine[]; error?: string };
    setBusy("");
    if (!response.ok || !result.lines) return setMessage(result.error || "The PDF could not be read.");
    setLines(result.lines); setMessage("Proposed lines are ready for review.");
  }

  async function publish() {
    if (!confirmed || !lines.length) return setMessage("Confirm the employee supplied or approved these details before publishing.");
    setBusy("publish");
    const records = lines.map<StaffAvailability>((line) => ({ id: crypto.randomUUID(), staffInviteId, weekday: line.weekday, specificDate: null, startTime: line.startTime, endTime: line.endTime, kind: line.kind, recurring: true, notes: line.notes }));
    const results = await Promise.all(records.map(saveStaffAvailability));
    const saved = records.filter((_, index) => results[index].saved);
    setBusy("");
    if (saved.length !== records.length) return setMessage(`${saved.length} of ${records.length} lines published. Review the remaining lines and retry.`);
    onPublished(saved); setLines([]); setFile(null); setConfirmed(false); setMessage("Employee availability published.");
  }

  function updateLine(id: string, field: keyof ProposedLine, value: string) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: field === "weekday" ? Number(value) : value } : line));
    setConfirmed(false);
  }

  async function finishError(response: Response, fallback: string) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(""); setMessage(result.error || fallback);
  }

  return (
    <Card className="xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Availability form</p><h2 className="mt-1 text-xl font-bold text-ink">PDF to published availability</h2><p className="mt-1 text-sm text-slate-600">Download, complete, extract and review.</p></div>
        <button type="button" onClick={downloadTemplate} disabled={!staffInviteId || Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50"><Download size={17} />Download PDF</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Completed employee form<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <button type="button" onClick={parseForm} disabled={!file || Boolean(busy)} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:opacity-50"><Sparkles size={17} />{busy === "parse" ? "Reading..." : "Extract with AI"}</button>
      </div>
      {lines.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-600"><th className="p-2">Day</th><th className="p-2">From</th><th className="p-2">To</th><th className="p-2">Status</th><th className="p-2">Notes</th></tr></thead><tbody>{lines.map((line) => <tr key={line.id} className="border-b border-slate-100"><td className="p-2"><select value={line.weekday} onChange={(event) => updateLine(line.id, "weekday", event.target.value)} className="min-h-10 rounded-md border border-slate-300 px-2">{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></td><td className="p-2"><input type="time" value={line.startTime} onChange={(event) => updateLine(line.id, "startTime", event.target.value)} className="min-h-10 rounded-md border border-slate-300 px-2" /></td><td className="p-2"><input type="time" value={line.endTime} onChange={(event) => updateLine(line.id, "endTime", event.target.value)} className="min-h-10 rounded-md border border-slate-300 px-2" /></td><td className="p-2"><select value={line.kind} onChange={(event) => updateLine(line.id, "kind", event.target.value)} className="min-h-10 rounded-md border border-slate-300 px-2"><option value="available">Available</option><option value="preferred">Preferred</option><option value="unavailable">Unavailable</option></select></td><td className="p-2"><input value={line.notes} onChange={(event) => updateLine(line.id, "notes", event.target.value)} className="min-h-10 w-full rounded-md border border-slate-300 px-2" /></td></tr>)}</tbody></table></div> : null}
      {lines.length ? <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><label className="flex max-w-2xl items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" /><span>I confirm the employee supplied or approved these availability details. AI extraction has been reviewed.</span></label><button type="button" onClick={publish} disabled={!confirmed || Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"><Check size={17} />{busy === "publish" ? "Publishing..." : "Publish availability"}</button></div> : null}
      <p className="mt-4 text-sm font-semibold text-slate-600" role="status">{message}</p>
    </Card>
  );
}

function authHeaders() { return { Authorization: `Bearer ${getStoredAccessToken() || ""}`, "Content-Type": "application/json" }; }
