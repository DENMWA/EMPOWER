"use client";

import { useEffect, useMemo, useState } from "react";
import { GuidedVoiceDocumentation } from "@/components/voice/GuidedVoiceDocumentation";
import { MissingDetailChecker } from "@/components/notes/MissingDetailChecker";
import { NoteQualityScore } from "@/components/notes/NoteQualityScore";
import { PersonCentredRewrite } from "@/components/notes/PersonCentredRewrite";
import { RecordActions } from "@/components/records/RecordActions";
import { Card } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { participants, sampleRoughNote, supportTypes, type Participant } from "@/lib/sample-data";
import { checkMissingDetails, getProgressNoteRewriteOptions, scoreNoteQuality, suggestGoalLinks } from "@/lib/ai-mock";
import { markTrialStepComplete } from "@/lib/trial-run";

type ContinenceCareRecord = {
  applicableSupports: string[];
  bowelMovement: string;
  bristolType: string;
  urineRecord: string;
  urineAppearance: string;
  uridomeCare: string;
  catheterCare: string;
  colostomyBagCare: string;
  incontinenceSupport: string;
  personalCareNotes: string;
};

type MealAndFluidEntry = {
  id: string;
  time: string;
  mealContext: string;
  foodName: string;
  portionPercent: string;
  foodNotes: string;
  drinkType: string;
  amountMl: string;
  fluidNotes: string;
};

type MonthlyReport = {
  wellbeing: string;
  goals: string;
  dailyLiving: string;
  communityAccess: string;
  health: string;
  behaviours: string;
  familyTeam: string;
  risks: string;
  recommendations: string;
  nextMonth: string;
};

type NoteClient = Participant & { colourSchemeId?: string };

const continenceSupportOptions = [
  "Incontinence support",
  "Bowel movement record",
  "Urination record",
  "Uridome care",
  "Catheter care",
  "Colostomy bag care"
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

const bristolStoolChartReference = [
  { option: "Type 1 - Separate hard lumps", type: "Type 1", label: "Separate hard lumps, like nuts", note: "Hard to pass", shape: "lumps" },
  { option: "Type 2 - Lumpy and sausage-like", type: "Type 2", label: "Sausage-shaped but lumpy", note: "Firm and uneven", shape: "lumpy-log" },
  { option: "Type 3 - Sausage shape with cracks", type: "Type 3", label: "Like a sausage with cracks", note: "Cracked surface", shape: "cracked-log" },
  { option: "Type 4 - Smooth, soft sausage/snake", type: "Type 4", label: "Like a sausage or snake", note: "Smooth and soft", shape: "smooth-log" },
  { option: "Type 5 - Soft blobs with clear edges", type: "Type 5", label: "Soft blobs with clear-cut edges", note: "Passed easily", shape: "soft-blobs" },
  { option: "Type 6 - Mushy consistency", type: "Type 6", label: "Fluffy pieces with ragged edges", note: "Mushy stool", shape: "mushy" },
  { option: "Type 7 - Watery, no solid pieces", type: "Type 7", label: "Watery, no solid pieces", note: "Entirely liquid", shape: "liquid" }
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
  colostomyBagCare: "Not applicable",
  incontinenceSupport: "Not required during this support",
  personalCareNotes: "Privacy, dignity, consent, hygiene, infection-control steps, and participant response recorded where applicable."
};

const initialMealAndFluidLog: MealAndFluidEntry[] = [
  { id: "meal-fluid-1", time: "08:00", mealContext: "Breakfast", foodName: "Toast and fruit", portionPercent: "75", foodNotes: "Ate independently with verbal prompting", drinkType: "Water", amountMl: "250", fluidNotes: "With breakfast" },
  { id: "meal-fluid-2", time: "10:30", mealContext: "Morning tea", foodName: "Biscuit", portionPercent: "100", foodNotes: "No concerns observed", drinkType: "Tea", amountMl: "200", fluidNotes: "Morning tea" }
];

const monthlyReportFields: { key: keyof MonthlyReport; title: string; prompt: string }[] = [
  { key: "wellbeing", title: "Overall wellbeing and presentation", prompt: "Mood, engagement, emotional wellbeing, communication, routines, and any notable changes this month." },
  { key: "goals", title: "NDIS goals and progress", prompt: "Progress toward goals, skills practised, barriers, achievements, and evidence observed by staff." },
  { key: "dailyLiving", title: "Daily living and personal care", prompt: "Personal care, meals, continence/toileting, medication prompts, sleep/routine, hygiene, and independence." },
  { key: "communityAccess", title: "Community access and participation", prompt: "Outings, appointments, social connection, transport, confidence, choice-making, and community safety." },
  { key: "health", title: "Health, appointments and therapy", prompt: "Medical updates, allied health input, therapy recommendations, medication or health concerns to monitor." },
  { key: "behaviours", title: "Behaviours, incidents and irregular supports", prompt: "Incident themes, triggers, de-escalation strategies, irregular support patterns, and what worked well." },
  { key: "familyTeam", title: "Family, guardian and team communication", prompt: "Key communication, requests, feedback, consent issues, handovers, and stakeholder updates." },
  { key: "risks", title: "Risks, safeguards and restrictive practices", prompt: "Current risks, safeguarding actions, environmental concerns, restrictive-practice considerations, and follow-up." },
  { key: "recommendations", title: "Key worker recommendations", prompt: "Support changes, roster considerations, plan review issues, documentation needs, referrals, or escalation." },
  { key: "nextMonth", title: "Priorities for next month", prompt: "Focus areas, goals to reinforce, appointments to prepare for, family/team actions, and due dates." }
];

const initialMonthlyReport: MonthlyReport = {
  wellbeing: "",
  goals: "",
  dailyLiving: "",
  communityAccess: "",
  health: "",
  behaviours: "",
  familyTeam: "",
  risks: "",
  recommendations: "",
  nextMonth: ""
};

function BristolStoolChartReference({ selectedType, onSelect }: { selectedType: string; onSelect: (value: string) => void }) {
  return (
    <div className="rounded-md border border-amber-300 bg-white p-4 shadow-inner lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-ink">Bristol Stool Chart reference for bowel care</h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">Select a type from the chart or the dropdown above. The selected type is highlighted for the note.</p>
        </div>
        <span className="rounded-md bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950">{selectedType.startsWith("Type") ? selectedType.split(" - ")[0] : "Type 1-7"}</span>
      </div>
      <div className="mt-4 grid gap-2">
        {bristolStoolChartReference.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelect(item.option)}
            className={`grid w-full gap-3 rounded-md border p-3 text-left transition sm:grid-cols-[76px_150px_minmax(0,1fr)] sm:items-center ${selectedType === item.option ? "border-amber-700 bg-amber-100 ring-2 ring-amber-300" : "border-amber-100 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50"}`}
          >
            <p className="text-sm font-bold text-amber-950">{item.type}</p>
            <StoolShape shape={item.shape} />
            <p className="text-sm leading-5 text-slate-700">
              <span className="font-semibold text-ink">{item.label}</span>
              <span className="block text-slate-600">{item.note}</span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StoolShape({ shape }: { shape: string }) {
  const lump = "block h-5 w-5 rounded-full bg-amber-900 shadow-sm";
  const smallLump = "block h-4 w-6 rounded-full bg-amber-900 shadow-sm";

  if (shape === "lumps") {
    return (
      <div className="flex h-12 flex-wrap content-center gap-1">
        {Array.from({ length: 7 }).map((_, index) => <span key={index} className={lump} />)}
      </div>
    );
  }

  if (shape === "lumpy-log") {
    return (
      <div className="flex h-12 items-center">
        {Array.from({ length: 7 }).map((_, index) => <span key={index} className="-ml-1 block h-7 w-7 rounded-full bg-amber-900 shadow-sm first:ml-0" />)}
      </div>
    );
  }

  if (shape === "cracked-log") {
    return <div className="h-7 w-28 rounded-[999px] bg-amber-900 shadow-sm ring-2 ring-amber-800/40" />;
  }

  if (shape === "smooth-log") {
    return <div className="h-5 w-32 rounded-[999px] bg-amber-900 shadow-sm" />;
  }

  if (shape === "soft-blobs") {
    return (
      <div className="flex h-12 flex-wrap content-center gap-1">
        {Array.from({ length: 6 }).map((_, index) => <span key={index} className={smallLump} />)}
      </div>
    );
  }

  if (shape === "mushy") {
    return <div className="h-8 w-28 rounded-[50%] bg-amber-800 shadow-sm ring-4 ring-amber-700/20" />;
  }

  return <div className="h-9 w-28 rounded-[45%] bg-amber-700/80 shadow-sm ring-4 ring-amber-700/15" />;
}

export function ProgressNoteGenerator() {
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const allParticipants = useMemo<NoteClient[]>(() => storedClients.length ? storedClients : participants, [storedClients]);
  const [selectedParticipantId, setSelectedParticipantId] = useState(participants[0]?.id ?? "");
  const [roughNote, setRoughNote] = useState(sampleRoughNote);
  const [rewriteOptions, setRewriteOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [supportType, setSupportType] = useState("Community access");
  const [supportDate, setSupportDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [finishTime, setFinishTime] = useState("12:00");
  const [continenceRecord, setContinenceRecord] = useState<ContinenceCareRecord>(initialContinenceRecord);
  const [mealAndFluidLog, setMealAndFluidLog] = useState<MealAndFluidEntry[]>(initialMealAndFluidLog);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport>(initialMonthlyReport);
  const selectedParticipant = allParticipants.find((participant) => participant.id === selectedParticipantId) ?? allParticipants[0];
  const selectedParticipantName = selectedParticipant?.name ?? "Client";
  const quality = scoreNoteQuality();
  const showPersonalCareRecord = ["Personal care", "Bowel care"].includes(supportType);
  const showMealsAndFluidLog = supportType === "Meals and fluid log";
  const showMonthlyReport = supportType === "Key Worker Monthly Report";
  const monthlyReportBody = useMemo(() => [
    `Key Worker Monthly Report`,
    `Client: ${selectedParticipantName}`,
    `Generated: ${new Date().toLocaleDateString("en-AU")}`,
    "",
    ...monthlyReportFields.flatMap((field) => [
      field.title,
      monthlyReport[field.key] || "Not completed",
      ""
    ])
  ].join("\n"), [monthlyReport, selectedParticipantName]);

  useEffect(() => {
    getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
  }, []);

  useEffect(() => {
    if ((!selectedParticipantId || !allParticipants.some((participant) => participant.id === selectedParticipantId)) && allParticipants[0]) {
      setSelectedParticipantId(allParticipants[0].id);
    }
  }, [allParticipants, selectedParticipantId]);

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

  function updateMealAndFluidEntry(id: string, patch: Partial<MealAndFluidEntry>) {
    setMealAndFluidLog((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  }

  function addMealAndFluidEntry() {
    setMealAndFluidLog((current) => [
      ...current,
      { id: `meal-fluid-${Date.now()}`, time: "", mealContext: "", foodName: "", portionPercent: "", foodNotes: "", drinkType: "Water", amountMl: "", fluidNotes: "" }
    ]);
  }

  function removeMealAndFluidEntry(id: string) {
    setMealAndFluidLog((current) => current.filter((entry) => entry.id !== id));
  }

  function updateMonthlyReport(field: keyof MonthlyReport, value: string) {
    setMonthlyReport((current) => ({ ...current, [field]: value }));
  }

  function formatContinenceSummary() {
    if (!showPersonalCareRecord) return "";

    return [
      "Personal care continence/toileting record:",
      `Applicable support: ${continenceRecord.applicableSupports.length ? continenceRecord.applicableSupports.join(", ") : "Not selected"}.`,
      `Bowel movement: ${continenceRecord.bowelMovement}. Bristol Stool Chart: ${continenceRecord.bristolType}.`,
      `Urination record: ${continenceRecord.urineRecord}. Appearance/concerns: ${continenceRecord.urineAppearance}.`,
      `Uridome care: ${continenceRecord.uridomeCare}.`,
      `Catheter care: ${continenceRecord.catheterCare}.`,
      `Colostomy bag care: ${continenceRecord.colostomyBagCare}.`,
      `Incontinence support: ${continenceRecord.incontinenceSupport}.`,
      `Additional personal care notes: ${continenceRecord.personalCareNotes}.`
    ].join("\n");
  }

  function formatMealsAndFluidSummary() {
    if (!showMealsAndFluidLog) return "";

    const foodSummary = mealAndFluidLog.length
      ? mealAndFluidLog.map((entry) => `${entry.time || "Time not recorded"} - ${entry.mealContext || "Meal/context not recorded"}: ${entry.foodName || "Food not recorded"}; portion eaten ${entry.portionPercent || "not recorded"}%${entry.foodNotes ? ` (${entry.foodNotes})` : ""}`).join("; ")
      : "No food intake recorded";

    const fluidSummary = mealAndFluidLog.length
      ? mealAndFluidLog.map((entry) => `${entry.time || "Time not recorded"} - ${entry.amountMl || "Amount not recorded"}mL ${entry.drinkType}${entry.fluidNotes ? ` (${entry.fluidNotes})` : ""}`).join("; ")
      : "No fluid intake recorded";

    return [
      "Meals and fluid log:",
      `Food intake: ${foodSummary}.`,
      `Fluid intake: ${fluidSummary}.`
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
    const mealsAndFluidSummary = formatMealsAndFluidSummary();
    const careSummaries = [continenceSummary, mealsAndFluidSummary].filter(Boolean).join("\n\n");
    const noteWithCareRecord = careSummaries ? `${option}\n\n${careSummaries}` : option;
    setRoughNote(noteWithCareRecord);
    setRewriteOptions([]);
    setMissing([
      ...checkMissingDetails(noteWithCareRecord),
      ...(showPersonalCareRecord && continenceRecord.applicableSupports.length === 0 ? ["Select applicable continence/toileting support"] : [])
    ]);
    markTrialStepComplete("progress-note");
  }

  function useVoiceTranscript(transcript: string) {
    setRoughNote(transcript);
    setRewriteOptions([]);
    setMissing(checkMissingDetails(transcript));
  }

  const noteRecordBody = [
    `Client: ${selectedParticipantName}`,
    `Support type: ${supportType}`,
    `Date: ${supportDate}`,
    `Time: ${startTime} to ${finishTime}`,
    "",
    roughNote
  ].join("\n");

  const noteRecordId = `progress-note-${selectedParticipantId || "client"}-${supportDate}-${startTime.replace(":", "")}-${finishTime.replace(":", "")}`;

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
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={selectedParticipantId} onChange={(event) => setSelectedParticipantId(event.target.value)}>
              {allParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
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
            <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="date" value={supportDate} onChange={(event) => setSupportDate(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">
              Start
              <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Finish
              <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="time" value={finishTime} onChange={(event) => setFinishTime(event.target.value)} />
            </label>
          </div>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Shift note
          <textarea className="mt-2 min-h-40 w-full rounded-md border border-slate-300 bg-slate-50 p-4 leading-7 text-black shadow-inner placeholder:text-slate-500" value={roughNote} onChange={(event) => setRoughNote(event.target.value)} />
        </label>
        <GuidedVoiceDocumentation embedded onUseTranscript={useVoiceTranscript} />
        {showPersonalCareRecord ? (
          <div className="mt-5 rounded-md border border-teal-100 bg-teal-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">Personal care record</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Bowel, continence and urinary support</h3>
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
              <BristolStoolChartReference selectedType={continenceRecord.bristolType} onSelect={(value) => updateContinenceField("bristolType", value)} />
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
              <label className="text-sm font-semibold text-slate-700">
                Uridome care
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.uridomeCare} onChange={(event) => updateContinenceField("uridomeCare", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Catheter care
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.catheterCare} onChange={(event) => updateContinenceField("catheterCare", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Colostomy bag care
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.colostomyBagCare} onChange={(event) => updateContinenceField("colostomyBagCare", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Incontinence support provided
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.incontinenceSupport} onChange={(event) => updateContinenceField("incontinenceSupport", event.target.value)} />
              </label>
              <label className="text-sm font-semibold text-slate-700 lg:col-span-2">
                Privacy, dignity, consent, hygiene and follow-up notes
                <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 leading-6 shadow-sm" value={continenceRecord.personalCareNotes} onChange={(event) => updateContinenceField("personalCareNotes", event.target.value)} />
              </label>
            </div>
          </div>
        ) : null}
        {showMealsAndFluidLog ? (
          <div className="mt-5 rounded-md border border-sky-100 bg-sky-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">Meals and fluid log</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Meals, food intake and fluid intake</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Record meals, food intake, percentage eaten, and fluids taken with meals, snacks, or medication prompts.</p>
              </div>
              <button type="button" onClick={addMealAndFluidEntry} className="min-h-10 rounded-md bg-ink px-3 text-sm font-semibold text-white shadow-lift">Add meal/fluid</button>
            </div>
            <div className="mt-4 grid gap-3">
              {mealAndFluidLog.map((entry) => (
                <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1.6fr_1fr_auto]">
                    <label className="text-sm font-semibold text-slate-700">
                      Time
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" type="time" value={entry.time} onChange={(event) => updateMealAndFluidEntry(entry.id, { time: event.target.value })} />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Meal/context
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.mealContext} onChange={(event) => updateMealAndFluidEntry(entry.id, { mealContext: event.target.value })} placeholder="Breakfast, lunch, snack..." />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Food name
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.foodName} onChange={(event) => updateMealAndFluidEntry(entry.id, { foodName: event.target.value })} placeholder="Sandwich, soup, yoghurt..." />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Eaten (%)
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" inputMode="numeric" min="0" max="100" type="number" value={entry.portionPercent} onChange={(event) => updateMealAndFluidEntry(entry.id, { portionPercent: event.target.value })} placeholder="75" />
                    </label>
                    <button type="button" onClick={() => removeMealAndFluidEntry(entry.id)} className="min-h-10 self-end rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700">Remove</button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_1.5fr]">
                    <label className="text-sm font-semibold text-slate-700">
                      Fluid
                      <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.drinkType} onChange={(event) => updateMealAndFluidEntry(entry.id, { drinkType: event.target.value })}>
                        {drinkTypeOptions.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Amount (mL)
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" inputMode="numeric" value={entry.amountMl} onChange={(event) => updateMealAndFluidEntry(entry.id, { amountMl: event.target.value })} />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Food notes
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.foodNotes} onChange={(event) => updateMealAndFluidEntry(entry.id, { foodNotes: event.target.value })} placeholder="Prompting, assistance, swallowing concerns..." />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Fluid notes
                      <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 shadow-sm" value={entry.fluidNotes} onChange={(event) => updateMealAndFluidEntry(entry.id, { fluidNotes: event.target.value })} placeholder="With meal, refused, encouraged..." />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <button type="button" onClick={improve} className="mt-4 inline-flex min-h-12 items-center rounded-md bg-sea px-5 text-sm font-semibold text-white shadow-lift">
          {loading ? "Improving note..." : "Improve Note with Fidelity"}
        </button>
        <RecordActions
          className="mt-3"
          recordId={noteRecordId}
          recordType="progress-note"
          title={`Professional Progress Note - ${selectedParticipantName}`}
          body={noteRecordBody}
          filename={`empower-notes-progress-note-${selectedParticipantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${supportDate}`}
          allowDownload={false}
        />
      </Card>
      {showMonthlyReport ? (
        <Card className="border-sky-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">Key worker monthly report</p>
              <h2 className="mt-1 text-2xl font-bold text-ink">Monthly support summary for {selectedParticipantName}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Use these headings to summarise progress, patterns, concerns, and next actions for the client you support.</p>
            </div>
            <span className="rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">Client monthly view</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {monthlyReportFields.map((field) => (
              <label key={field.key} className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>{field.title}</span>
                <span className="text-xs font-medium leading-5 text-slate-500">{field.prompt}</span>
                <textarea
                  className="min-h-32 rounded-md border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-ink shadow-inner focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  value={monthlyReport[field.key]}
                  onChange={(event) => updateMonthlyReport(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <RecordActions
            className="mt-5"
            recordId={`monthly-report-${selectedParticipantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            recordType="key-worker-monthly-report"
            title={`Key Worker Monthly Report - ${selectedParticipantName}`}
            body={monthlyReportBody}
            filename={`empowernotes-monthly-report-${selectedParticipantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          />
        </Card>
      ) : null}
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
    </div>
  );
}
