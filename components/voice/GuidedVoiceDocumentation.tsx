"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { GuidedInterview } from "@/components/voice/GuidedInterview";
import { ReadBackControls } from "@/components/voice/ReadBackControls";
import { improveTranscriptToProgressNote } from "@/lib/ai-mock";

export function GuidedVoiceDocumentation() {
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

  function saveFinalNote(status: string) {
    window.localStorage.setItem(`empower-retained-record:voice-note-${Date.now()}`, JSON.stringify({
      id: `voice-note-${Date.now()}`,
      type: "progress-note",
      title: `Voice note - ${status}`,
      body: finalNote,
      savedAt: new Date().toISOString()
    }));
    setActionMessage(status);
  }

  return (
    <Card className="space-y-6 border-teal-100 bg-white" id="voice">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Guided Voice Documentation</p>
          <h2 className="mt-1 text-3xl font-bold text-ink">A premium voice-to-compliant-documentation workflow</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Capture natural speech, keep the transcript for audit trail, then convert it into objective, person-centred support documentation with risk and evidence prompts.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge label="Transcript preserved" tone="blue" />
          <StatusBadge label="Read-back ready" tone="green" />
          <StatusBadge label="Mock AI safe" tone="slate" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <VoiceRecorder onTranscript={setTranscript} />
        <GuidedInterview onComplete={setTranscript} />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor="transcript">Transcript preview and edit</label>
        <textarea id="transcript" className="mt-2 min-h-36 w-full rounded-md border border-slate-300 bg-slate-50 p-4 leading-7 shadow-inner" value={transcript} onChange={(event) => setTranscript(event.target.value)} />
      </div>
      <button type="button" onClick={improve} disabled={!transcript || loading} className="inline-flex min-h-12 items-center rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
        {loading ? "Improving and checking risk..." : "Improve Note"}
      </button>
      {finalNote ? (
        <div className="space-y-4">
          <div className="rounded-md border border-teal-100 bg-teal-50 p-5">
            <p className="text-sm font-semibold text-slate-600">AI-generated professional note</p>
            <p className="mt-2 leading-7 text-ink">{finalNote}</p>
          </div>
          <ReadBackControls text={finalNote} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => saveFinalNote("Submitted for manager approval")} className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Submit for manager approval</button>
            <button type="button" onClick={() => saveFinalNote("Self-certified")} className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink">Self-certify note</button>
            <button type="button" onClick={() => saveFinalNote("Draft saved")} className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink">Save draft</button>
          </div>
          {actionMessage ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
