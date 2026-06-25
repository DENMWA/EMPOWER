"use client";

import { useState } from "react";
import { Mic, Square } from "lucide-react";
import { transcribeVoiceNote } from "@/lib/ai-mock";

export function VoiceRecorder({ onTranscript }: { onTranscript: (transcript: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggleRecording() {
    if (!recording) {
      setRecording(true);
      return;
    }
    setRecording(false);
    setLoading(true);
    const transcript = await transcribeVoiceNote();
    onTranscript(transcript);
    setLoading(false);
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={toggleRecording}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording note" : "Record note"}
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-sea px-5 text-base font-semibold text-white hover:bg-teal-800"
      >
        {recording ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
        {recording ? "Stop Recording" : "Record Note"}
      </button>
      <p className="mt-3 text-sm text-slate-600">{loading ? "Transcribing voice note..." : recording ? "Recording demo state active. Tap stop to generate transcript." : "Browser speech support can replace this mock recorder in production."}</p>
    </div>
  );
}
