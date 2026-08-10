"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { ReadBackControls } from "@/components/voice/ReadBackControls";
import { improveTranscriptToProgressNote } from "@/lib/ai-mock";

export function GuidedVoiceDocumentation({ embedded = false, onUseTranscript }: { embedded?: boolean; onUseTranscript?: (transcript: string) => void }) {
  const [transcript, setTranscript] = useState("");
  const [finalNote, setFinalNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function improve() {
    setLoading(true);
    const improved = await improveTranscriptToProgressNote(transcript);
    setFinalNote(improved);
    setLoading(false);
  }

  function selectForNote(text: string, label: string) {
    const cleanText = text.trim();
    if (!cleanText) {
      setActionMessage("Add a transcript first.");
      return;
    }
    onUseTranscript?.(cleanText);
    setActionMessage(onUseTranscript ? `${label} placed into the note pad. Review it, then select Submit.` : `${label} is ready.`);
  }

  const content = (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">{embedded ? "Voice note option" : "Guided Voice Documentation"}</p>
          <h2 className={`${embedded ? "text-xl" : "text-3xl"} mt-1 font-bold text-ink`}>
            {embedded ? "Record or paste a transcript for this progress note" : "A premium voice-to-compliant-documentation workflow"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Capture natural speech, then choose either the original wording or an improved version for the final progress note.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge label="Worker chooses final wording" tone="blue" />
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
          <button type="button" onClick={() => selectForNote(transcript, "Original note")} disabled={!transcript.trim()} className="inline-flex min-h-11 items-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
            Use original note
          </button>
          <button type="button" onClick={improve} disabled={!transcript.trim() || loading} className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
            {loading ? "Improving..." : "Improve transcript"}
          </button>
        </div>
        {actionMessage ? <p aria-live="polite" className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}
      </div>
      {finalNote ? (
        <div className="space-y-4">
          <div className="rounded-md border border-teal-100 bg-teal-50 p-5">
            <p className="text-sm font-semibold text-slate-600">AI-generated professional note</p>
            <p className="mt-2 leading-7 text-ink">{finalNote}</p>
          </div>
          <ReadBackControls text={finalNote} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => selectForNote(finalNote, "Improved note")} className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Use improved note</button>
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
