"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CalendarPlus, Camera, CheckCircle2, Trash2, X } from "lucide-react";
import { AppointmentComposer } from "@/components/appointments/AppointmentComposer";
import { BodyMap, type BodyMarker, type BodyView } from "@/components/incidents/IncidentReportForm";
import { ProgressNoteWritingPad } from "@/components/notes/ProgressNoteWritingPad";
import { ClientIdentity } from "@/components/participants/PrivateClientPhoto";
import { RecordActions } from "@/components/records/RecordActions";
import { Card } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getHousesForClient, getTenantHouses, type HouseRecord } from "@/lib/house-records";
import { participants, sampleRoughNote, supportTypes, type Participant } from "@/lib/sample-data";
import { checkMissingDetails, getProgressNoteRewriteOptions, scoreNoteQuality } from "@/lib/ai-mock";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { markTrialStepComplete } from "@/lib/trial-run";
import { saveTenantProgressNote } from "@/lib/progress-note-records";
import { getActiveParticipantGoals, type ParticipantGoalRecord } from "@/lib/plan-progress/goal-records";

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

type PersonalCareRecord = {
  showerOutcome: string;
  clientInvolvement: string;
  showerPosition: string;
  equipmentUsed: string[];
  careTasks: string[];
  skinObservation: string;
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

type NoteClient = Participant & { colourSchemeId?: string; preferredName?: string; profilePhotoPath?: string };
type ProgressNoteEditorState = {
  originalInput: string;
  workingDraft: string;
  voiceTranscript: string;
  aiImprovedVersion: string | null;
  preImprovementDraft: string;
  inputMethod: "typed" | "voice" | "mixed";
};

const continenceSupportOptions = [
  "Incontinence support",
  "Bowel movement record",
  "Urination record",
  "Uridome care",
  "Catheter care",
  "Colostomy bag care"
];

const bowelCareOptions = [
  "Prompting provided",
  "Physical assistance provided",
  "Privacy and dignity maintained",
  "Hygiene support completed",
  "Continence aid changed",
  "Colostomy bag checked",
  "Colostomy bag changed",
  "Fluids encouraged",
  "Concern reported to supervisor"
];

const bowelMovementOptions = [
  "Bowel movement passed",
  "No bowel movement",
  "Attempted but not passed",
  "Support declined",
  "Not observed"
];

const showerOutcomeOptions = ["Shower completed", "Partial shower completed", "Bed wash completed", "Personal care declined", "Not required"];
const clientInvolvementOptions = ["Independent", "Prompting only", "Partial physical assistance", "Full physical assistance"];
const showerPositionOptions = ["Standing", "Seated on shower chair", "Seated on commode chair", "Seated and standing", "Bed-based care"];
const personalCareEquipmentOptions = ["Shower chair", "Commode chair", "Hand-held shower", "Grab rails", "Non-slip mat", "Transfer belt", "Hoist", "Personal protective equipment"];
const personalCareTaskOptions = ["Body wash", "Hair washed", "Intimate care", "Oral care", "Shaving/grooming", "Skin care applied", "Dressing support", "Continence aid changed"];
const skinObservationOptions = ["No concerns observed", "Redness observed", "Bruising observed", "Rash observed", "Wound/dressing observed", "Pain or discomfort reported", "Concern escalated"];
const personalCareInjuryTypes = ["Redness", "Bruise", "Rash", "Wound", "Skin tear", "Swelling", "Pain", "Other"];

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
  bowelMovement: "Not observed",
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

const initialPersonalCareRecord: PersonalCareRecord = {
  showerOutcome: showerOutcomeOptions[0],
  clientInvolvement: clientInvolvementOptions[0],
  showerPosition: showerPositionOptions[0],
  equipmentUsed: [],
  careTasks: [],
  skinObservation: skinObservationOptions[0]
};

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
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [availableGoals, setAvailableGoals] = useState<ParticipantGoalRecord[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [progressNoteId] = useState(() => globalThis.crypto?.randomUUID?.() || `progress-note-${Date.now()}`);
  const [editor, setEditor] = useState<ProgressNoteEditorState>({ originalInput: "", workingDraft: "", voiceTranscript: "", aiImprovedVersion: null, preImprovementDraft: "", inputMethod: "typed" });
  const roughNote = editor.workingDraft;
  const inputMethod = editor.inputMethod;
  const [photoEvidence, setPhotoEvidence] = useState<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [supportType, setSupportType] = useState("Community access");
  const [supportDate, setSupportDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [finishTime, setFinishTime] = useState("12:00");
  const [continenceRecord, setContinenceRecord] = useState<ContinenceCareRecord>(initialContinenceRecord);
  const [personalCareRecord, setPersonalCareRecord] = useState<PersonalCareRecord>(initialPersonalCareRecord);
  const [personalCareMarkers, setPersonalCareMarkers] = useState<BodyMarker[]>([]);
  const [mealAndFluidLog, setMealAndFluidLog] = useState<MealAndFluidEntry[]>(initialMealAndFluidLog);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport>(initialMonthlyReport);
  const [appointmentComposerOpen, setAppointmentComposerOpen] = useState(false);
  const accessibleHouses = houses;
  const baseParticipants = useMemo<NoteClient[]>(() => storedClients.length ? storedClients : realMode ? [] : participants, [storedClients, realMode]);
  const selectedParticipant = baseParticipants.find((participant) => participant.id === selectedParticipantId) ?? baseParticipants[0];
  const participantHouses = useMemo(() => selectedParticipant ? getHousesForClient(accessibleHouses, selectedParticipant) : [], [accessibleHouses, selectedParticipant]);
  const selectedHouse = participantHouses.find((house) => house.id === selectedHouseId) ?? participantHouses[0];
  const selectedParticipantName = selectedParticipant?.name ?? "Client";
  const participantGoals = selectedParticipant?.goals || [];
  const isBowelCare = supportType === "Bowel care";
  const isPersonalCare = supportType === "Personal care";
  const showMealsAndFluidLog = supportType === "Meals and fluid log";
  const showAppointmentCard = supportType === "Appointment support";
  const isFocusedCareLog = isBowelCare || isPersonalCare || showMealsAndFluidLog;
  const recordNarrative = isBowelCare ? formatBowelCareSummary() : isPersonalCare ? formatPersonalCareSummary() : showMealsAndFluidLog ? formatMealsAndFluidSummary() : roughNote;
  const quality = scoreNoteQuality(recordNarrative, participantGoals.length > 0);
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
    getTenantHouses().then(setHouses).catch(() => setHouses([]));
  }, []);

  useEffect(() => {
    let active = true;
    setSelectedGoalIds([]);
    getActiveParticipantGoals(selectedParticipantId)
      .then((goals) => { if (active) setAvailableGoals(goals); })
      .catch(() => { if (active) setAvailableGoals([]); });
    return () => { active = false; };
  }, [selectedParticipantId]);

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  useEffect(() => {
    if (!realMode && !roughNote) {
      setEditor((current) => ({ ...current, originalInput: sampleRoughNote, workingDraft: sampleRoughNote }));
    }

    if (realMode && roughNote === sampleRoughNote) {
      setEditor((current) => ({ ...current, originalInput: "", workingDraft: "" }));
    }
  }, [realMode, roughNote]);

  useEffect(() => {
    if ((!selectedParticipantId || !baseParticipants.some((participant) => participant.id === selectedParticipantId)) && baseParticipants[0]) {
      setSelectedParticipantId(baseParticipants[0].id);
      return;
    }

    if (!baseParticipants.length && selectedParticipantId) {
      setSelectedParticipantId("");
    }
  }, [baseParticipants, selectedParticipantId]);

  useEffect(() => {
    if (participantHouses.length && !participantHouses.some((house) => house.id === selectedHouseId)) {
      setSelectedHouseId(participantHouses[0].id);
      return;
    }

    if (!participantHouses.length && selectedHouseId) {
      setSelectedHouseId("");
    }
  }, [participantHouses, selectedHouseId]);

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

  function togglePersonalCareSelection(field: "equipmentUsed" | "careTasks", value: string) {
    setPersonalCareRecord((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value]
    }));
  }

  function addPersonalCareMarker(view: BodyView, x: number, y: number, area: string) {
    const injury = personalCareRecord.skinObservation.includes("Redness") ? "Redness"
      : personalCareRecord.skinObservation.includes("Bruis") ? "Bruise"
        : personalCareRecord.skinObservation.includes("Rash") ? "Rash"
          : personalCareRecord.skinObservation.includes("Wound") ? "Wound"
            : personalCareRecord.skinObservation.includes("Pain") ? "Pain" : "Other";
    setPersonalCareMarkers((current) => [...current, {
      id: `personal-care-marker-${Date.now()}`,
      view,
      x,
      y,
      area,
      injury,
      severity: "Observed",
      notes: ""
    }]);
  }

  function updatePersonalCareMarker(id: string, injury: string) {
    setPersonalCareMarkers((current) => current.map((marker) => marker.id === id ? { ...marker, injury } : marker));
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

  function formatPersonalCareSummary() {
    return [
      "Personal care record:",
      `Outcome: ${personalCareRecord.showerOutcome}.`,
      `Client involvement: ${personalCareRecord.clientInvolvement}.`,
      `Position: ${personalCareRecord.showerPosition}.`,
      `Equipment used: ${personalCareRecord.equipmentUsed.length ? personalCareRecord.equipmentUsed.join(", ") : "None selected"}.`,
      `Care completed: ${personalCareRecord.careTasks.length ? personalCareRecord.careTasks.join(", ") : "None selected"}.`,
      `Skin observation: ${personalCareRecord.skinObservation}.`,
      `Body map locations: ${personalCareMarkers.length ? personalCareMarkers.map((marker) => `${marker.area} (${marker.injury})`).join(", ") : "No locations marked"}.`
    ].join("\n");
  }

  function formatBowelCareSummary() {
    const selectedSupports = continenceRecord.applicableSupports.filter((support) => bowelCareOptions.includes(support));
    return [
      "Bowel care record:",
      `Outcome: ${continenceRecord.bowelMovement}.`,
      `Bristol Stool Chart: ${continenceRecord.bristolType}.`,
      `Support provided: ${selectedSupports.length ? selectedSupports.join(", ") : "None selected"}.`
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
    if (!roughNote.trim()) return;
    setLoading(true);
    const options = await getProgressNoteRewriteOptions(roughNote);
    const improved = options[0]?.trim();
    if (improved) {
      setEditor((current) => ({
        ...current,
        originalInput: current.originalInput || current.workingDraft,
        preImprovementDraft: current.workingDraft,
        workingDraft: improved,
        aiImprovedVersion: improved
      }));
      setMissing(checkMissingDetails(improved));
      markTrialStepComplete("progress-note");
    }
    setLoading(false);
  }

  function updateWorkingDraft(value: string) {
    setEditor((current) => ({
      ...current,
      workingDraft: value,
      originalInput: current.aiImprovedVersion ? current.originalInput : value,
      inputMethod: current.voiceTranscript ? "mixed" : "typed"
    }));
    setMissing(checkMissingDetails(value));
  }

  function applyVoiceTranscript(transcript: string) {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) return;
    setEditor((current) => {
      if (current.voiceTranscript.split("\n\n").includes(cleanTranscript)) return current;
      const workingDraft = appendParagraph(current.workingDraft, cleanTranscript);
      return {
        ...current,
        originalInput: appendParagraph(current.originalInput, cleanTranscript),
        workingDraft,
        voiceTranscript: appendParagraph(current.voiceTranscript, cleanTranscript),
        preImprovementDraft: current.aiImprovedVersion
          ? appendParagraph(current.preImprovementDraft, cleanTranscript)
          : current.preImprovementDraft,
        inputMethod: current.workingDraft.trim() ? "mixed" : "voice"
      };
    });
    setMissing(checkMissingDetails(appendParagraph(roughNote, cleanTranscript)));
  }

  function undoImprovement() {
    setEditor((current) => ({ ...current, workingDraft: current.preImprovementDraft || current.originalInput, aiImprovedVersion: null }));
  }

  function addPhotoEvidence(files: FileList | null) {
    const images = Array.from(files || []).filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);
    setPhotoEvidence((current) => [
      ...current,
      ...images.slice(0, Math.max(0, 4 - current.length)).map((file) => ({ id: `${file.name}-${file.lastModified}`, file, previewUrl: URL.createObjectURL(file) }))
    ]);
  }

  function removePhotoEvidence(id: string) {
    setPhotoEvidence((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  const noteRecordBody = [
    `Client: ${selectedParticipantName}`,
    `House/service: ${selectedHouse?.name ?? "Not selected"}`,
    `Support type: ${supportType}`,
    `Date: ${supportDate}`,
    `Time: ${startTime} to ${finishTime}`,
    "",
    recordNarrative
  ].join("\n");

  const noteRecordId = `progress-note-${selectedParticipantId || "client"}-${selectedHouseId || "service"}-${supportDate}-${startTime.replace(":", "")}-${finishTime.replace(":", "")}`;
  const selectedHouseName = selectedHouse?.name ?? "Unassigned service";
  const selectedHouseSlug = selectedHouseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "service";

  function persistProgressNote(status: "Draft" | "Submitted") {
    return saveTenantProgressNote({
      id: progressNoteId,
      participantId: selectedParticipantId,
      supportDate,
      startTime,
      endTime: finishTime,
      supportType,
      note: noteRecordBody,
      status,
      originalInput: isFocusedCareLog ? recordNarrative : editor.originalInput,
      voiceTranscript: editor.voiceTranscript,
      workingDraft: recordNarrative,
      aiImprovedVersion: editor.aiImprovedVersion,
      finalApprovedVersion: status === "Submitted" ? recordNarrative : null,
      inputMethod,
      missingDetails: missing,
      qualityScore: quality.auditReadiness,
      billingEvidenceScore: quality.billingEvidenceScore,
      qualityBreakdown: quality,
      photoFiles: isFocusedCareLog ? [] : photoEvidence.map((photo) => photo.file),
      linkedGoalIds: selectedGoalIds
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">{isFocusedCareLog ? "Care record" : "Note details"}</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">{isBowelCare ? "Record bowel care clearly" : isPersonalCare ? "Record shower and personal care" : showMealsAndFluidLog ? "Record meals and fluid intake" : "Support record"}</h2>
          </div>
          <span className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-teal-900">{isFocusedCareLog ? "Focused entry" : "Draft"}</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">
            Participant/client
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={selectedParticipantId} onChange={(event) => setSelectedParticipantId(event.target.value)}>
              {!baseParticipants.length ? <option value="">No clients available</option> : null}
              {baseParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            House/service
            <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={selectedHouseId} onChange={(event) => setSelectedHouseId(event.target.value)}>
              {!participantHouses.length ? <option value="">No house assigned to this client</option> : null}
              {participantHouses.map((house) => <option key={house.id} value={house.id}>{house.name} - {house.serviceType}</option>)}
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
        {selectedParticipant ? <ClientIdentity client={selectedParticipant} detail={[selectedHouse?.name, selectedHouse?.serviceType].filter(Boolean).join(" - ")} className="mt-4 rounded-md border border-slate-200 bg-white p-3" /> : null}
        {showAppointmentCard ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 p-3">
            <div>
              <p className="text-sm font-bold text-ink">Appointment reminder</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Add the appointment in a quick panel, then continue this progress note from the same place.</p>
            </div>
            <button type="button" onClick={() => setAppointmentComposerOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sea px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
              <CalendarPlus size={16} aria-hidden="true" />
              Add appointment
            </button>
          </div>
        ) : null}
        {availableGoals.length && !isFocusedCareLog ? (
          <fieldset className="mt-4 rounded-md border border-slate-200 bg-white p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Goals relevant to this note</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {availableGoals.map((goal) => (
                <label key={goal.id} className="flex min-h-11 items-start gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedGoalIds.includes(goal.id)}
                    onChange={() => setSelectedGoalIds((current) => current.includes(goal.id) ? current.filter((id) => id !== goal.id) : [...current, goal.id])}
                  />
                  <span><span className="font-semibold text-ink">{goal.title}</span><span className="block text-xs text-slate-500">{goal.category} · Pending manager verification after submission</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {!isFocusedCareLog ? <>
          <ProgressNoteWritingPad
            value={roughNote}
            originalInput={editor.originalInput}
            hasImprovement={Boolean(editor.aiImprovedVersion)}
            improving={loading}
            quality={quality}
            missingDetails={missing}
            goal={participantGoals[0] || ""}
            onChange={updateWorkingDraft}
            onTranscript={applyVoiceTranscript}
            onImprove={() => void improve()}
            onUndo={undoImprovement}
          />
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-ink"><Camera size={18} aria-hidden="true" />Attach photos to this note</p>
              <p className="mt-1 text-xs text-slate-600">Photos remain private and appear with this note after it is saved. Up to 4 images, maximum 5 MB each.</p>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-900">
              <Camera size={17} aria-hidden="true" />
              Attach photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { addPhotoEvidence(event.target.files); event.target.value = ""; }} />
            </label>
          </div>
          {photoEvidence.length ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} aria-hidden="true" />{photoEvidence.length} {photoEvidence.length === 1 ? "photo" : "photos"} ready to save with this note</p> : null}
          {photoEvidence.length ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {photoEvidence.map((photo) => (
                <div key={photo.id} className="w-28 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <Image src={photo.previewUrl} alt="Shift note evidence preview" width={112} height={84} unoptimized className="h-20 w-full object-cover" />
                  <button type="button" onClick={() => removePhotoEvidence(photo.id)} className="min-h-9 w-full text-xs font-semibold text-red-700">Remove</button>
                </div>
              ))}
            </div>
          ) : null}
          </div>
        </> : null}
        {isBowelCare ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Bowel care</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Bowel movement record</h3>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-amber-900">Select what applies</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Bowel movement outcome
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={continenceRecord.bowelMovement} onChange={(event) => updateContinenceField("bowelMovement", event.target.value)}>
                  {bowelMovementOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Bristol stool type
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={continenceRecord.bristolType} onChange={(event) => updateContinenceField("bristolType", event.target.value)}>
                  {bristolStoolOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-700">Support provided</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bowelCareOptions.map((option) => (
                  <label key={option} className="flex min-h-11 items-center gap-3 rounded-md border border-amber-100 bg-white px-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={continenceRecord.applicableSupports.includes(option)} onChange={() => toggleApplicableSupport(option)} />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4">
              <BristolStoolChartReference selectedType={continenceRecord.bristolType} onSelect={(value) => updateContinenceField("bristolType", value)} />
            </div>
          </div>
        ) : null}
        {isPersonalCare ? (
          <div className="mt-5 rounded-md border border-teal-100 bg-teal-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">Personal care record</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Shower, hygiene and client participation</h3>
              </div>
              <span className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-teal-900">Choose what applies</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                Shower outcome
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={personalCareRecord.showerOutcome} onChange={(event) => setPersonalCareRecord((current) => ({ ...current, showerOutcome: event.target.value }))}>
                  {showerOutcomeOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Client involvement
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={personalCareRecord.clientInvolvement} onChange={(event) => setPersonalCareRecord((current) => ({ ...current, clientInvolvement: event.target.value }))}>
                  {clientInvolvementOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Position used
                <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={personalCareRecord.showerPosition} onChange={(event) => setPersonalCareRecord((current) => ({ ...current, showerPosition: event.target.value }))}>
                  {showerPositionOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-700">Equipment used</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {personalCareEquipmentOptions.map((option) => <label key={option} className="flex min-h-11 items-center gap-3 rounded-md border border-teal-100 bg-white px-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={personalCareRecord.equipmentUsed.includes(option)} onChange={() => togglePersonalCareSelection("equipmentUsed", option)} />{option}</label>)}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-700">Care completed</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {personalCareTaskOptions.map((option) => <label key={option} className="flex min-h-11 items-center gap-3 rounded-md border border-teal-100 bg-white px-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={personalCareRecord.careTasks.includes(option)} onChange={() => togglePersonalCareSelection("careTasks", option)} />{option}</label>)}
              </div>
            </fieldset>
            <label className="mt-4 block max-w-xl text-sm font-semibold text-slate-700">
              Skin observation
              <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={personalCareRecord.skinObservation} onChange={(event) => {
                const skinObservation = event.target.value;
                setPersonalCareRecord((current) => ({ ...current, skinObservation }));
                if (skinObservation === "No concerns observed") setPersonalCareMarkers([]);
              }}>
                {skinObservationOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            {personalCareRecord.skinObservation !== "No concerns observed" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Click the body map to mark each area observed</p>
                  <BodyMap markers={personalCareMarkers} onAdd={addPersonalCareMarker} onSelect={() => undefined} />
                </div>
                <div className="rounded-md border border-red-100 bg-white p-4">
                  <h4 className="font-bold text-ink">Marked areas</h4>
                  <div className="mt-3 grid gap-3">
                    {personalCareMarkers.map((marker) => (
                      <div key={marker.id} className="rounded-md border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="font-semibold text-ink">{marker.area}</p><p className="text-xs capitalize text-slate-500">{marker.view} view</p></div>
                          <button type="button" onClick={() => setPersonalCareMarkers((current) => current.filter((item) => item.id !== marker.id))} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-700" aria-label={`Remove ${marker.area} marker`}><Trash2 size={16} aria-hidden="true" /></button>
                        </div>
                        <label className="mt-3 block text-xs font-semibold text-slate-600">Observation
                          <select className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" value={marker.injury} onChange={(event) => updatePersonalCareMarker(marker.id, event.target.value)}>
                            {personalCareInjuryTypes.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        </label>
                      </div>
                    ))}
                    {!personalCareMarkers.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No body location marked yet.</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
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
        {selectedHouse ? (
          <RecordActions
            className="mt-3"
            recordId={noteRecordId}
            recordType="progress-note"
            title={`Professional Progress Note - ${selectedParticipantName} - ${selectedHouseName}`}
            body={noteRecordBody}
            filename={`empower-notes-progress-note-${selectedParticipantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${selectedHouseSlug}-${supportDate}`}
            allowDownload={false}
            actionLabel="Submit"
            saveDraftRelatedRecord={() => persistProgressNote("Draft")}
            saveRelatedRecord={() => persistProgressNote("Submitted")}
          />
        ) : (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">This client needs a house/service assignment before the shift note can be saved. Ask an authorised team leader to update the client profile.</p>
        )}
      </Card>

      {showAppointmentCard && appointmentComposerOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-3 py-6" role="dialog" aria-modal="true" aria-label="Add appointment reminder">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lift">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Quick appointment</p>
                <h2 className="text-lg font-bold text-ink">Add appointment and reminder</h2>
              </div>
              <button type="button" onClick={() => setAppointmentComposerOpen(false)} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400" aria-label="Close appointment panel">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4">
              <AppointmentComposer mode="worker" initialParticipantId={selectedParticipantId} initialHouseId={selectedHouseId} compact onSaved={() => setAppointmentComposerOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
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
    </div>
  );
}

function appendParagraph(existing: string, addition: string) {
  const cleanExisting = existing.trim();
  const cleanAddition = addition.trim();
  if (!cleanExisting) return cleanAddition;
  if (!cleanAddition || cleanExisting.includes(cleanAddition)) return cleanExisting;
  return `${cleanExisting}\n\n${cleanAddition}`;
}
