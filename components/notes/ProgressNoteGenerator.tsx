"use client";

import { useState } from "react";
import { GuidedVoiceDocumentation } from "@/components/voice/GuidedVoiceDocumentation";
import { MissingDetailChecker } from "@/components/notes/MissingDetailChecker";
import { NoteQualityScore } from "@/components/notes/NoteQualityScore";
import { PersonCentredRewrite } from "@/components/notes/PersonCentredRewrite";
import { Card } from "@/components/ui";
import { participants, sampleRoughNote, supportTypes } from "@/lib/sample-data";
import { checkMissingDetails, improveTranscriptToProgressNote, scoreNoteQuality, suggestGoalLinks } from "@/lib/ai-mock";

export function ProgressNoteGenerator() {
  const [roughNote, setRoughNote] = useState(sampleRoughNote);
  const [finalNote, setFinalNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const quality = scoreNoteQuality();

  async function improve() {
    setLoading(true);
    const improved = await improveTranscriptToProgressNote(roughNote);
    setFinalNote(improved);
    setMissing(checkMissingDetails(improved));
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Progress note studio</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Turn rough notes into professional records</h2>
          </div>
          <span className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-teal-900">Audit trail preserved</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">
            Participant/client
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm">
              {participants.map((participant) => <option key={participant.id}>{participant.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Support type
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm">
              {supportTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Date
            <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="date" defaultValue="2026-06-25" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">
              Start
              <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="time" defaultValue="10:00" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Finish
              <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="time" defaultValue="12:00" />
            </label>
          </div>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Rough note or dictated text
          <textarea className="mt-2 min-h-40 w-full rounded-md border border-slate-300 bg-slate-50 p-4 leading-7 shadow-inner" value={roughNote} onChange={(event) => setRoughNote(event.target.value)} />
        </label>
        <button type="button" onClick={improve} className="mt-4 inline-flex min-h-12 items-center rounded-md bg-sea px-5 text-sm font-semibold text-white shadow-lift">
          {loading ? "Improving note..." : "Improve Note"}
        </button>
      </Card>
      {finalNote ? (
        <Card>
          <h2 className="text-xl font-semibold text-ink">Professional Progress Note</h2>
          <p className="mt-3 leading-7 text-slate-800">{finalNote}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Submit for review</button>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink">Save draft</button>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink">Export PDF</button>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <NoteQualityScore quality={quality} />
        <MissingDetailChecker missing={missing.length ? missing : ["Location", "Exact start and finish time", "Goal link", "Specific follow-up owner"]} />
      </div>
      <PersonCentredRewrite text="Client was aggressive and refused to listen." />
      <Card>
        <h2 className="text-xl font-semibold text-ink">Goal-linking Assistant</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestGoalLinks().map((goal) => <span key={goal} className="rounded-md bg-skySoft px-3 py-2 text-sm font-semibold text-sky-900">{goal}</span>)}
        </div>
      </Card>
      <GuidedVoiceDocumentation />
    </div>
  );
}
