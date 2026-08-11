"use client";

import { useState } from "react";
import { Eye, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { NoteQualityScore } from "@/components/notes/NoteQualityScore";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import type { NoteQuality } from "@/lib/ai-mock";

type Props = {
  value: string;
  originalInput: string;
  hasImprovement: boolean;
  improving: boolean;
  quality: NoteQuality;
  missingDetails: string[];
  goal: string;
  onChange: (value: string) => void;
  onTranscript: (transcript: string) => void;
  onImprove: () => void;
  onUndo: () => void;
};

export function ProgressNoteWritingPad({ value, originalInput, hasImprovement, improving, quality, missingDetails, goal, onChange, onTranscript, onImprove, onUndo }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");

  function readAloud() {
    if (!("speechSynthesis" in window)) return setSpeechMessage("Text-to-speech is not available in this browser.");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(value));
    setSpeechMessage("Reading the current note aloud.");
  }

  return (
    <section aria-labelledby="progress-note-pad-title" className="mt-5 rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h3 id="progress-note-pad-title" className="text-lg font-semibold text-ink">Progress note</h3>
        <p className="mt-1 text-sm text-slate-600">Write or speak naturally about the support.</p>
      </div>
      <label className="sr-only" htmlFor="progress-note-working-draft">Progress note working draft</label>
      <textarea
        id="progress-note-working-draft"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type or dictate your progress note..."
        className="mt-3 min-h-[45vh] w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-4 text-base leading-7 text-black shadow-inner placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:min-h-64"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <VoiceRecorder compact onTranscript={onTranscript} />
        <button type="button" disabled={!value.trim() || improving} onClick={onImprove} aria-label="Improve note with AI" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"><Sparkles size={17} aria-hidden="true" />{improving ? "Improving..." : hasImprovement ? "Re-improve" : "Improve note"}</button>
        <button type="button" disabled={!value.trim()} onClick={readAloud} aria-label="Read current note aloud" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink disabled:text-slate-400"><Volume2 size={17} aria-hidden="true" />Read aloud</button>
      </div>
      {speechMessage ? <p role="status" className="mt-2 text-sm text-slate-600">{speechMessage}</p> : null}

      {hasImprovement ? (
        <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p className="font-semibold">Note improved - original preserved</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowOriginal((visible) => !visible)} aria-expanded={showOriginal} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 font-semibold"><Eye size={16} aria-hidden="true" />View original</button>
            <button type="button" onClick={onUndo} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 font-semibold"><RotateCcw size={16} aria-hidden="true" />Undo improvement</button>
          </div>
          {showOriginal ? <div className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-emerald-100 bg-white p-3 text-slate-700" aria-label="Original progress note">{originalInput || "No original input recorded."}</div> : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3">
        <NoteQualityScore quality={quality} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink">{goal ? `Goal: ${goal}` : "Goal link suggested"}</span>
          {goal ? <span aria-label="Goal linked">✓</span> : null}
        </div>
        {missingDetails.length ? <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"><p className="font-semibold">{missingDetails.length} {missingDetails.length === 1 ? "detail" : "details"} to review</p><ul className="mt-1 list-disc pl-5">{missingDetails.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      </div>
    </section>
  );
}
