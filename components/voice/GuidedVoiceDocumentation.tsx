"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { GuidedInterview } from "@/components/voice/GuidedInterview";
import { ReadBackControls } from "@/components/voice/ReadBackControls";
import { improveTranscriptToProgressNote } from "@/lib/ai-mock";

export function GuidedVoiceDocumentation() {
  const [transcript, setTranscript] = useState("");
  const [finalNote, setFinalNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function improve() {
    setLoading(true);
    const improved = await improveTranscriptToProgressNote(transcript);
    setFinalNote(improved);
    setLoading(false);
  }

  return (
    <Card className="space-y-5" id="voice">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sea">Guided Voice Documentation</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">Typed notes, standard voice notes, and guided interviews</h2>
      </div>
      <VoiceRecorder onTranscript={setTranscript} />
      <GuidedInterview onComplete={setTranscript} />
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor="transcript">Transcript preview and edit</label>
        <textarea id="transcript" className="mt-2 min-h-32 w-full rounded-md border border-slate-300 p-3" value={transcript} onChange={(event) => setTranscript(event.target.value)} />
      </div>
      <button type="button" onClick={improve} disabled={!transcript || loading} className="inline-flex min-h-11 items-center rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
        {loading ? "Improving and checking risk..." : "Improve Note"}
      </button>
      {finalNote ? (
        <div className="space-y-4">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-600">AI-generated professional note</p>
            <p className="mt-2 leading-7 text-ink">{finalNote}</p>
          </div>
          <ReadBackControls text={finalNote} />
          <div className="flex flex-wrap gap-3">
            <button className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Submit for manager approval</button>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink">Self-certify note</button>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink">Save draft</button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
