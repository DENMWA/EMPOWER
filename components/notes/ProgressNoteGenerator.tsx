"use client";

import { useState } from "react";
import { GuidedVoiceDocumentation } from "@/components/voice/GuidedVoiceDocumentation";
import { MissingDetailChecker } from "@/components/notes/MissingDetailChecker";
import { NoteQualityScore } from "@/components/notes/NoteQualityScore";
import { PersonCentredRewrite } from "@/components/notes/PersonCentredRewrite";
import { ProgressNoteCollectionExport } from "@/components/notes/ProgressNoteCollectionExport";
import { RecordActions } from "@/components/records/RecordActions";
import { Card } from "@/components/ui";
import { participants, sampleRoughNote, supportTypes } from "@/lib/sample-data";
import { checkMissingDetails, getProgressNoteRewriteOptions, scoreNoteQuality, suggestGoalLinks } from "@/lib/ai-mock";

type ContinenceCareRecord = {
  applicableSupports: string[];
  bowelMovement: string;
  bristolType: string;
  urineRecord: string;
  urineAppearance: string;
  uridomeCare: string;
  catheterCare: string;
  incontinenceSupport: string;
  toiletingSupport: string;
  personalCareNotes: string;
};

type FluidIntakeEntry = {
  id: string;
  time: string;
  drinkType: string;
  amountMl: string;
  notes: string;
};

const continenceSupportOptions = [
  "Incontinence support",
  "Toileting support",
  "Bowel movement record",
  "Urination record",
  "Uridome care",
  "Catheter care",
  "Fluid intake"
];

const bristolStoolOptions = [
  "Not applicable / no bowel movement observed",
  "Type 1 - Separate hard lumps",
  "Type 2 - Lumpy and sausage-like",
  "Type 3 - Sausage shape with cracks",
  "Type 4 - Smooth, soft sausage/snake",
  "Type 5 - Soft blobs with clear edges",
  "Type 6 - Mushy consistency",
  "Type 7 - Watery, no solid pieces"
];

const urineRecordOptions = [
  "Not applicable / not observed",
  "Passed urine independently",
  "Prompted/supported to toilet",
  "Incontinence pad changed",
  "Uridome checked/changed",
  "Catheter bag checked/emptied",
  "No urine passed during support"
];

const drinkTypeOptions = ["Water", "Tea", "Coffee", "Juice", "Soft drink", "Milk", "Supplement drink", "Other"];

const initialContinenceRecord: ContinenceCareRecord = {
  applicableSupports: [],
  bowelMovement: "Not observed during support",
  bristolType: bristolStoolOptions[0],
  urineRecord: urineRecordOptions[0],
  urineAppearance: "Not observed",
  uridomeCare: "Not applicable",
  catheterCare: "Not applicable",
  incontinenceSupport: "Not required during this support",
  toiletingSupport: "Not required during this support",
  personalCareNotes: "Privacy, dignity, consent, hygiene, infection-control steps, and participant response recorded where applicable."
};

const initialFluidIntake: FluidIntakeEntry[] = [
  { id: "fluid-1", time: "08:00", drinkType: "Water", amountMl: "250", notes: "With breakfast" },
  { id: "fluid-2", time: "10:30", drinkType: "Tea", amountMl: "200", notes: "Morning tea" }
];

export function ProgressNoteGenerator() {
  const [roughNote, setRoughNote] = useState(sampleRoughNote);
  const [rewriteOptions, setRewriteOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [supportType, setSupportType] = useState("Community access");
  const [continenceRecord, setContinenceRecord] = useState<ContinenceCareRecord>(initialContinenceRecord);
  const [fluidIntake, setFluidIntake] = useState<FluidIntakeEntry[]>(initialFluidIntake);
  const quality = scoreNoteQuality();
  const showPersonalCareRecord = ["Personal care", "Incontinence support", "Toileting support", "Meal preparation"].includes(supportType);

  function updateContinenceField<K extends keyof ContinenceCareRecord>(field: K, value: ContinenceCareRecord[K]) {
    setContinenceRecord((current) => ({ ...current, [field]: value }));
  }

  function toggleApplicableSupport(value: string) {
    setContinenceRecord((current) => ({
      ...current,
      applicableSupports: current.applicableSupports.includes(value)
        ? current.applicableSupports.filter((item) => item !== value)
        : [...current.applicableSupports, value]
    }));
  }

  function updateFluidIntake(id: string, patch: Partial<FluidIntakeEntry>) {
    setFluidIntake((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  }

  function addFluidIntake() {
    setFluidIntake((current) => [
      ...current,
      { id: `fluid-${Date.now()}`, time: "", drinkType: "Water", amountMl: "", notes: "" }
    ]);
  }

  function removeFluidIntake(id: string) {
    setFluidIntake((current) => current.filter((entry) => entry.id !== id));
  }

  function formatContinenceSummary() {
    if (!showPersonalCareRecord) return "";

    const fluidSummary = fluidIntake.length
      ? fluidIntake.map((entry) => `${entry.time || "Time not recorded"} - ${entry.amountMl || "Amount not recorded"}mL ${entry.drinkType}${entry.notes ? ` (${entry.notes})` : ""}`).join("; ")
      : "No fluid intake recorded";

    return [
      "Personal care continence/toileting record:",
      `Applicable support: ${continenceRecord.applicableSupports.length ? continenceRecord.applicableSupports.join(", ") : "Not selected"}.`,
      `Bowel movement: ${continenceRecord.bowelMovement}. Bristol Stool Chart: ${continenceRecord.bristolType}.`,
      `Urination record: ${continenceRecord.urineRecord}. Appearance/concerns: ${continenceRecord.urineAppearance}.`,
      `Fluid intake: ${fluidSummary}.`,
      `Uridome care: ${continenceRecord.uridomeCare}.`,
      `Catheter care: ${continenceRecord.catheterCare}.`,
      `Incontinence support: ${continenceRecord.incontinenceSupport}.`,
      `Toileting support: ${continenceRecord.toiletingSupport}.`,
      `Additional personal care notes: ${continenceRecord.personalCareNotes}.`
    ].join("\n");
  }

  async function improve() {
    setLoading(true);
    const options = await getProgressNoteRewriteOptions(roughNote);
    setRewriteOptions(options);
    setMissing([]);
    setLoading(false);
  }

  function useRewriteOption(option: string) {
    const continenceSummary = formatContinenceSummary();
    const noteWithCareRecord = continenceSummary ? `${option}\n\n${continenceSummary}` : option;
    setRoughNote(noteWithCareRecord);
    setRewriteOptions([]);
    setMissing([
      ...checkMissingDetails(noteWithCareRecord),
      ...(showPersonalCareRecord && continenceRecord.applicableSupports.length === 0 ? ["Select applicable continence/toileting support"] : [])
    ]);
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Progress note studio</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Improve shift notes without changing the facts</h2>
          </div>
          <span className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-teal-900">Original note preserved</span>
        </div>
        <div className="mb-5 rounded-md border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          <p className="font-semibold">Fidelity-first improvement</p>
          <p className="mt-1">EmpowerNotes keeps the worker's original shift note first, then expands only within the documented facts. Missing details are flagged for confirmation instead of being invented.</p>
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
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={supportType} onChange={(event) => setSupportType(event.target.value)}>
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
          Shift note
          <textarea className="mt-2 min-h-40 w-full rounded-md border border-slate-300 bg-slate-50 p-4 leading-7 shadow-inner" value={roughNote} onChange={(event) => setRoughNote(event.target.value)} />
        </label>
        {showPersonalCareRecord ? (
          <div className="mt-5 rounded-md border border-teal-100 bg-teal-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">Personal care record</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Continence, toileting, bowel and urinary support</h3>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-teal-900">Choose what applies</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {continenceSupportOptions.map((option) => (
                <label key={option} className="flex min-h-11 items-center gap-2 rounded-md border border-teal-100 bg-white px-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={continenceRecord.applicableSupports.includes(option)} onChange={() => toggleApplicableSupport(option)} />
                  {option}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Bowel movement
                <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={continenceRecord.bowelMovement} onChange={(event) => updateContinenceField("bowelMovement", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Bristol Stool Chart
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={continenceRecord.bristolType} onChange={(event) => updateContinenceField("bristolType", event.target.value)}>
                  {bristolStoolOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Urination / uridome / catheter record
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={continenceRecord.urineRecord} onChange={(event) => updateContinenceField("urineRecord", event.target.value)}>
                  {urineRecordOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Urine appearance / concerns
                <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={continenceRecord.urineAppearance} onChange={(event) => updateContinenceField("urineAppearance", event.target.value)} />
              </label>
              <div className="rounded-md border border-sky-100 bg-white p-4 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-ink">Fluid intake</h4>
                    <p className="mt-1 text-sm text-slate-600">Record fluids by time, drink type, and amount in mL, including drinks taken with meals.</p>
                  </div>
                  <button type="button" onClick={addFluidIntake} className="min-h-10 rounded-md bg-ink px-3 text-sm font-semibold text-white shadow-lift">Add fluid</button>
                </div>
                <div className="mt-4 grid gap-3">
                  {fluidIntake.map((entry) => (
                    <div key={entry.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
                      <label className="text-sm font-semibold text-slate-700">
                        Time
                        <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" type="time" value={entry.time} onChange={(event) => updateFluidIntake(entry.id, { time: event.target.value })} />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Fluid
                        <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.drinkType} onChange={(event) => updateFluidIntake(entry.id, { drinkType: event.target.value })}>
                          {drinkTypeOptions.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Amount (mL)
                        <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" inputMode="numeric" value={entry.amountMl} onChange={(event) => updateFluidIntake(entry.id, { amountMl: event.target.value })} />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Meal/context
                        <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.notes} onChange={(event) => updateFluidIntake(entry.id, { notes: event.target.value })} placeholder="Breakfast, lunch, morning tea..." />
                      </label>
                      <button type="button" onClick={() => removeFluidIntake(entry.id)} className="min-h-10 self-end rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
              <label className="text-sm font-semibold text-slate-700">
                Uridome care
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.uridomeCare} onChange={(event) => updateContinenceField("uridomeCare", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Catheter care
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.catheterCare} onChange={(event) => updateContinenceField("catheterCare", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Incontinence support provided
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.incontinenceSupport} onChange={(event) => updateContinenceField("incontinenceSupport", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Toileting support provided
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.toiletingSupport} onChange={(event) => updateContinenceField("toiletingSupport", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700 lg:col-span-2">
                Privacy, dignity, consent, hygiene and follow-up notes
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.personalCareNotes} onChange={(event) => updateContinenceField("personalCareNotes", event.target.value)} />
              </label>
            </div>
          </div>
        ) : null}
        <button type="button" onClick={improve} className="mt-4 inline-flex min-h-12 items-center rounded-md bg-sea px-5 text-sm font-semibold text-white shadow-lift">
          {loading ? "Improving note..." : "Improve Note with Fidelity"}
        </button>
        <RecordActions
          className="mt-3"
          recordId="progress-note-draft"
          recordType="progress-note"
          title="Professional Progress Note"
          body={roughNote}
          filename="empower-notes-progress-note"
          allowDownload={false}
        />
      </Card>
      {rewriteOptions.length ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">Rephrased options</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">Choose the version that best fits the shift</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Click one option to place it into the note pad above, then edit or save it.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {rewriteOptions.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => useRewriteOption(option)}
                className="rounded-md border border-slate-200 bg-slate-50 p-4 text-left text-sm leading-7 text-slate-800 transition hover:border-teal-400 hover:bg-white focus:outline focus:outline-2 focus:outline-teal-700"
              >
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-sea">Option {index + 1}</span>
                {option}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      <ProgressNoteCollectionExport />
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
