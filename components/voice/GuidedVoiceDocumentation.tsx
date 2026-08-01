"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { ReadBackControls } from "@/components/voice/ReadBackControls";
import { improveTranscriptToProgressNote } from "@/lib/ai-mock";
import { saveTenantRetainedRecord } from "@/lib/retained-records";

export function GuidedVoiceDocumentation({ embedded = false, onUseTranscript }: { embedded?: boolean; onUseTranscript?: (transcript: string) => void }) {
  const [transcript, setTranscript] = useState("");
  const [finalNote, setFinalNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [pendingTranscriptId, setPendingTranscriptId] = useState("");
  const [pendingFinalNoteId, setPendingFinalNoteId] = useState("");

  async function improve() {
    setLoading(true);
    const improved = await improveTranscriptToProgressNote(transcript);
    setFinalNote(improved);
    setLoading(false);
  }

  function useTranscriptInNote() {
    const text = transcript.trim();
    if (!text) {
      setActionMessage("Add a transcript first.");
      return;
    }
    onUseTranscript?.(text);
    setActionMessage(onUseTranscript ? "Transcript placed into the note pad." : "Transcript is ready to improve or save.");
  }

  async function saveTranscriptDraft() {
    const text = transcript.trim();
    if (!text) {
      setActionMessage("Add a transcript first.");
      return;
    }
    setSaveState("saving");
    setActionMessage("Saving transcript to this organisation...");
    const savedAt = new Date().toISOString();
    const id = pendingTranscriptId || `voice-transcript-${Date.now()}`;
    if (!pendingTranscriptId) setPendingTranscriptId(id);
    const result = await saveTenantRetainedRecord({
      id,
      type: "voice-transcript",
      title: "Voice transcript draft",
      body: text,
      savedAt
    });
    setSaveState(result.savedToCloud ? "saved" : "failed");
    setActionMessage(result.savedToCloud ? "Transcript saved to this organisation." : `Cloud save failed. The transcript remains here for retry. ${result.error || "Try again."}`);
    if (result.savedToCloud) {
      setPendingTranscriptId("");
      window.dispatchEvent(new Event("empowernotes:retained-records-updated"));
    }
  }

  async function saveFinalNote(status: string) {
    if (!finalNote.trim()) {
      setActionMessage("Improve or write a final note first.");
      return;
    }
    setSaveState("saving");
    setActionMessage("Saving progress note to this organisation...");
    const savedAt = new Date().toISOString();
    const id = pendingFinalNoteId || `voice-note-${Date.now()}`;
    if (!pendingFinalNoteId) setPendingFinalNoteId(id);
    const result = await saveTenantRetainedRecord({
      id,
      type: "progress-note",
      title: `Voice note - ${status}`,
      body: [`Transcript:`, transcript, "", `Final note:`, finalNote].join("\n"),
      savedAt
    });
    setSaveState(result.savedToCloud ? "saved" : "failed");
    setActionMessage(result.savedToCloud ? `${status}. Saved to this organisation.` : `Cloud save failed. The note remains here for retry. ${result.error || "Try again."}`);
    if (result.savedToCloud) {
      setPendingFinalNoteId("");
      window.dispatchEvent(new Event("empowernotes:retained-records-updated"));
    }
  }

  const content = (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">{embedded ? "Voice note option" : "Guided Voice Documentation"}</p>
          <h2 className={`${embedded ? "text-xl" : "text-3xl"} mt-1 font-bold text-ink`}>
            {embedded ? "Record or paste a transcript for this progress note" : "A premium voice-to-compliant-documentation workflow"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Capture natural speech, keep the transcript for audit trail, then convert it into objective, person-centred support documentation with risk and evidence prompts.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge label="Transcript preserved" tone="blue" />
          <StatusBadge label="Read-back ready" tone="green" />
          <StatusBadge label="Fidelity checked" tone="slate" />
        </div>
      </div>
      <div>
        <VoiceRecorder onTranscript={setTranscript} />
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <label className="text-sm font-semibold text-slate-700" htmlFor="transcript">Transcript preview and edit</label>
        <textarea id="transcript" className="mt-2 min-h-36 w-full rounded-md border border-slate-300 bg-white p-4 leading-7 shadow-inner" value={transcript} onChange={(event) => setTranscript(event.target.value)} />
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={useTranscriptInNote} disabled={!transcript.trim()} className="inline-flex min-h-11 items-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
            Use transcript in note
          </button>
          <button type="button" onClick={saveTranscriptDraft} disabled={!transcript.trim() || saveState === "saving"} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
            {saveState === "saving" ? "Saving..." : saveState === "failed" && pendingTranscriptId ? "Retry transcript save" : "Save transcript draft"}
          </button>
          <button type="button" onClick={improve} disabled={!transcript.trim() || loading} className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
            {loading ? "Improving..." : "Improve transcript"}
          </button>
        </div>
        {actionMessage ? <p aria-live="polite" className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${saveState === "failed" ? "bg-red-50 text-red-700" : saveState === "saving" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{actionMessage}</p> : null}
      </div>
      {finalNote ? (
        <div className="space-y-4">
          <div className="rounded-md border border-teal-100 bg-teal-50 p-5">
            <p className="text-sm font-semibold text-slate-600">AI-generated professional note</p>
            <p className="mt-2 leading-7 text-ink">{finalNote}</p>
          </div>
          <ReadBackControls text={finalNote} />
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={saveState === "saving"} onClick={() => saveFinalNote("Submitted for manager approval")} className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">Submit for manager approval</button>
            <button type="button" disabled={saveState === "saving"} onClick={() => saveFinalNote("Self-certified")} className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:bg-slate-100">Self-certify note</button>
            <button type="button" disabled={saveState === "saving"} onClick={() => saveFinalNote("Draft saved")} className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:bg-slate-100">{saveState === "failed" && pendingFinalNoteId ? "Retry save" : "Save draft"}</button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="mt-5 space-y-5 rounded-md border border-teal-100 bg-teal-50/50 p-4" id="voice">
        {content}
      </div>
    );
  }

  return (
    <Card className="space-y-6 border-teal-100 bg-white" id="voice">
      {content}
    </Card>
  );
}
