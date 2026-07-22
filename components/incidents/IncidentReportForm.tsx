"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Download, Lock, Maximize2, Minimize2, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import { saveTenantRetainedRecord } from "@/lib/retained-records";
import { markTrialStepComplete } from "@/lib/trial-run";

type BodyView = "front" | "left" | "right" | "back";
type Status = "Draft" | "Submitted" | "Needs Review" | "Locked";
type IncidentTemplateId = "personalInjury" | "propertyDamage" | "absconding" | "behaviour" | "medication" | "medical" | "nearMiss" | "safeguarding" | "other";

type BodyMarker = {
  id: string;
  view: BodyView;
  x: number;
  y: number;
  area: string;
  injury: string;
  severity: string;
  notes: string;
};

type Attachment = {
  id: string;
  name: string;
  type: string;
  notes: string;
};

type PropertyDamageDetails = {
  involved: boolean;
  bodilyInjury: boolean;
  items: string[];
  otherItem: string;
  description: string;
  estimatedCost: string;
  immediateAction: string;
  bodilyInjuryDescription: string;
};

type IncidentSpecificDetails = {
  injuryTreatment: string;
  abscondingLastSeen: string;
  abscondingSearchActions: string;
  abscondingReturnDetails: string;
  abscondingEmergencyServices: string;
  behaviourTriggers: string;
  deEscalationStrategies: string;
  medicationDetails: string;
  medicalObservations: string;
  safeguardingDetails: string;
  nearMissRisk: string;
  otherDetails: string;
};

type IncidentReport = {
  templateId: IncidentTemplateId;
  incidentId: string;
  date: string;
  time: string;
  location: string;
  participant: string;
  reporter: string;
  status: Status;
  incidentTypes: string[];
  whatHappened: string;
  injurySummary: string;
  immediateAction: string;
  notifications: string;
  followUp: string;
  managerReview: string;
  propertyDamage: PropertyDamageDetails;
  specificDetails: IncidentSpecificDetails;
  markers: BodyMarker[];
  attachments: Attachment[];
};

const incidentTypes = ["Fall", "Injury", "Medication incident", "Behaviour/distress incident", "Property damage/destruction", "Near miss", "Safeguarding concern", "Medical event", "Other"];
const bodyAreas = ["Head", "Face", "Neck", "Left arm", "Right arm", "Chest", "Abdomen", "Upper back", "Lower back", "Left leg", "Right leg", "Left foot", "Right foot", "Other"];
const injuryTypes = ["Bruise", "Cut", "Swelling", "Redness", "Pain", "Scratch", "Skin tear", "Other"];
const propertyDamageItems = ["Car / vehicle", "House / property", "Window / door", "Furniture", "Appliance", "Assistive equipment", "Personal belongings", "Other"];

const incidentTemplates: Array<{
  id: IncidentTemplateId;
  title: string;
  detail: string;
  incidentTypes: string[];
  bodyMap: boolean;
  propertyDamage: boolean;
  fields: Array<{ key: keyof IncidentSpecificDetails; label: string; rows?: number }>;
}> = [
  {
    id: "personalInjury",
    title: "Personal injury",
    detail: "Falls, bruising, pain, skin tears, swelling, cuts, or other observed/reported injury.",
    incidentTypes: ["Injury"],
    bodyMap: true,
    propertyDamage: false,
    fields: [{ key: "injuryTreatment", label: "First aid, treatment, monitoring and pain response", rows: 4 }]
  },
  {
    id: "propertyDamage",
    title: "Property damage",
    detail: "Damage to a car, house, door, window, furniture, equipment, or personal belongings.",
    incidentTypes: ["Property damage/destruction"],
    bodyMap: false,
    propertyDamage: true,
    fields: [{ key: "otherDetails", label: "Context, witnesses, photos, repair steps, and who was notified", rows: 4 }]
  },
  {
    id: "absconding",
    title: "Absconding",
    detail: "Client left without notice, was missing, or moved away from agreed support/supervision.",
    incidentTypes: ["Safeguarding concern"],
    bodyMap: false,
    propertyDamage: false,
    fields: [
      { key: "abscondingLastSeen", label: "Last seen location, time, clothing, mood, and known direction", rows: 3 },
      { key: "abscondingSearchActions", label: "Search actions, staff response, transport checks, and locations checked", rows: 4 },
      { key: "abscondingEmergencyServices", label: "Police/emergency/family/guardian notifications and reference numbers", rows: 3 },
      { key: "abscondingReturnDetails", label: "Return details, wellbeing check, debrief, and follow-up safety plan", rows: 4 }
    ]
  },
  {
    id: "behaviour",
    title: "Behaviour / distress",
    detail: "Distress, behaviour of concern, escalation, de-escalation, triggers, or restrictive-practice review.",
    incidentTypes: ["Behaviour/distress incident"],
    bodyMap: false,
    propertyDamage: false,
    fields: [
      { key: "behaviourTriggers", label: "Known or possible triggers, early warning signs, and environment factors", rows: 4 },
      { key: "deEscalationStrategies", label: "De-escalation strategies used and what helped", rows: 4 }
    ]
  },
  {
    id: "medication",
    title: "Medication incident",
    detail: "Missed dose, wrong dose, refusal, medication error, side effect, or escalation.",
    incidentTypes: ["Medication incident"],
    bodyMap: false,
    propertyDamage: false,
    fields: [{ key: "medicationDetails", label: "Medication, dose/time, error/refusal details, advice sought, and monitoring", rows: 5 }]
  },
  {
    id: "medical",
    title: "Medical event",
    detail: "Seizure, illness, choking concern, wound concern, deterioration, or ambulance/GP review.",
    incidentTypes: ["Medical event"],
    bodyMap: true,
    propertyDamage: false,
    fields: [{ key: "medicalObservations", label: "Symptoms, observations, first aid, clinical advice, and monitoring plan", rows: 5 }]
  },
  {
    id: "nearMiss",
    title: "Near miss",
    detail: "An event that could have caused harm but was prevented or did not result in injury.",
    incidentTypes: ["Near miss"],
    bodyMap: false,
    propertyDamage: false,
    fields: [{ key: "nearMissRisk", label: "What could have happened, prevention actions, and future controls", rows: 4 }]
  },
  {
    id: "safeguarding",
    title: "Safeguarding concern",
    detail: "Abuse/neglect concern, unexplained injury, disclosure, exploitation, or reportable incident review.",
    incidentTypes: ["Safeguarding concern"],
    bodyMap: true,
    propertyDamage: false,
    fields: [{ key: "safeguardingDetails", label: "Concern, disclosure/observation, immediate safety actions, and escalation pathway", rows: 5 }]
  },
  {
    id: "other",
    title: "Other incident",
    detail: "Use when the incident does not fit the standard templates.",
    incidentTypes: ["Other"],
    bodyMap: false,
    propertyDamage: false,
    fields: [{ key: "otherDetails", label: "Additional structured details", rows: 4 }]
  }
];

const initialReport: IncidentReport = {
  templateId: "personalInjury",
  incidentId: "INC-2026-0007",
  date: "2026-06-25",
  time: "09:35",
  location: "Bathroom doorway, supported accommodation",
  participant: "Client D",
  reporter: "Support Worker A",
  status: "Draft",
  incidentTypes: ["Fall", "Injury"],
  whatHappened: "Participant slipped while walking to the bathroom and fell to the floor. Staff supported the participant to remain calm, checked for visible injury, provided first aid, notified the manager, and commenced monitoring.",
  injurySummary: "Bruising observed on left upper arm and redness observed on right upper back.",
  immediateAction: "Staff checked visible injury, provided reassurance, offered first aid, made the area safe, notified the manager, and commenced monitoring.",
  notifications: "Manager notified at 09:50. Case manager notified through internal handover note.",
  followUp: "Monitor pain, review bathroom threshold risk, and update the support plan if required.",
  managerReview: "Pending manager review. Consider whether escalation or reportable incident assessment is required.",
  propertyDamage: {
    involved: false,
    bodilyInjury: false,
    items: [],
    otherItem: "",
    description: "",
    estimatedCost: "",
    immediateAction: "",
    bodilyInjuryDescription: ""
  },
  specificDetails: {
    injuryTreatment: "First aid and monitoring commenced. Continue to observe for pain, swelling, skin changes, and changes in mobility.",
    abscondingLastSeen: "",
    abscondingSearchActions: "",
    abscondingReturnDetails: "",
    abscondingEmergencyServices: "",
    behaviourTriggers: "",
    deEscalationStrategies: "",
    medicationDetails: "",
    medicalObservations: "",
    safeguardingDetails: "",
    nearMissRisk: "",
    otherDetails: ""
  },
  markers: [
    { id: "marker-1", view: "front", x: 20, y: 35, area: "Left arm", injury: "Bruise", severity: "Mild", notes: "Approx. 3cm purple/blue bruising observed." },
    { id: "marker-2", view: "back", x: 82, y: 33, area: "Upper back", injury: "Redness", severity: "Mild", notes: "Approx. 4cm red area observed, no open skin." }
  ],
  attachments: [{ id: "attachment-1", name: "fall-body-map-export.pdf", type: "Body map export", notes: "Attach body map/photo evidence to the participant incident record in production." }]
};

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" />
    </label>
  );
}

function getBodyViewFromPoint(x: number): BodyView {
  if (x < 25) return "front";
  if (x < 50) return "left";
  if (x < 75) return "right";
  return "back";
}

function getBodyAreaFromPoint(view: BodyView, x: number, y: number) {
  const side = view === "front" || view === "back" ? (x < 12.5 || (x >= 75 && x < 87.5) ? "Right" : "Left") : view === "left" ? "Left" : "Right";

  if (y < 18) return "Head";
  if (y < 26) return view === "back" ? "Upper back" : "Neck";

  if (view === "front") {
    if ((x < 8 || x > 18) && y < 58) return `${side} arm`;
    if (y < 42) return "Chest";
    if (y < 55) return "Abdomen";
  }

  if (view === "back") {
    if ((x < 82 || x > 92) && y < 58) return `${side} arm`;
    if (y < 43) return "Upper back";
    if (y < 57) return "Lower back";
  }

  if (view === "left" || view === "right") {
    const bodySide = view === "left" ? "Left" : "Right";
    if (y < 58 && (x < 32 || x > 67)) return `${bodySide} arm`;
    if (y < 52) return view === "left" ? "Chest" : "Upper back";
  }

  if (y < 88) return `${side} leg`;
  return `${side} foot`;
}

function BodyMap({ markers, expanded, onAdd, onSelect }: { markers: BodyMarker[]; expanded?: boolean; onAdd: (view: BodyView, x: number, y: number, area: string) => void; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
        const view = getBodyViewFromPoint(x);
        onAdd(view, x, y, getBodyAreaFromPoint(view, x, y));
      }}
      className={`${expanded ? "min-h-[700px]" : "min-h-[600px]"} relative block w-full overflow-hidden rounded-md border border-slate-300 bg-white text-left shadow-inner transition-all xl:aspect-[306/220] xl:min-h-0`}
      aria-label="Add body map marker"
    >
      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white p-2">
        <Image
          src="/incident-body-map-reference.png"
          alt="Body map with front, side, and back views"
          fill
          priority
          sizes="(min-width: 1280px) 900px, 100vw"
          className="object-contain"
        />
      </div>
      <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-xs font-bold uppercase text-slate-600 shadow-sm">Clinical body chart</span>
      {markers.map((marker) => (
        <span
          key={marker.id}
          role="button"
          tabIndex={0}
          onClick={(event) => { event.stopPropagation(); onSelect(marker.id); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(marker.id); }}
          className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-red-600 text-xs font-bold text-white shadow-lift ring-4 ring-red-100"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          title={`${marker.view} - ${marker.area}: ${marker.injury}`}
        >
          !
        </span>
      ))}
    </button>
  );
}

export function IncidentReportForm() {
  const [report, setReport] = useState(initialReport);
  const [selectedMarkerId, setSelectedMarkerId] = useState(initialReport.markers[0]?.id ?? "");
  const [savedAt, setSavedAt] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [bodyMapExpanded, setBodyMapExpanded] = useState(false);

  const selectedMarker = report.markers.find((marker) => marker.id === selectedMarkerId);
  const exportText = useMemo(() => JSON.stringify(report, null, 2), [report]);
  const activeTemplate = incidentTemplates.find((template) => template.id === report.templateId) ?? incidentTemplates[0];
  const showPropertyDamage = activeTemplate.propertyDamage || report.propertyDamage.involved || report.incidentTypes.includes("Property damage/destruction");
  const showBodyMap = activeTemplate.bodyMap || report.propertyDamage.bodilyInjury || report.markers.length > 0 || report.incidentTypes.some((type) => ["Fall", "Injury", "Medical event", "Safeguarding concern"].includes(type));

  function update<K extends keyof IncidentReport>(field: K, value: IncidentReport[K]) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function selectTemplate(templateId: IncidentTemplateId) {
    const template = incidentTemplates.find((item) => item.id === templateId);
    if (!template) return;

    if (!template.bodyMap) {
      setSelectedMarkerId("");
      setBodyMapExpanded(false);
    } else if (!selectedMarkerId && report.markers[0]) {
      setSelectedMarkerId(report.markers[0].id);
    }

    setReport((current) => ({
      ...current,
      templateId,
      incidentTypes: template.incidentTypes,
      propertyDamage: {
        ...current.propertyDamage,
        involved: template.propertyDamage,
        bodilyInjury: template.bodyMap ? current.propertyDamage.bodilyInjury : false
      },
      markers: template.bodyMap ? current.markers : [],
      managerReview: `Pending manager review for ${template.title.toLowerCase()}. Confirm escalation, reportable incident obligations, notifications, and follow-up before locking.`
    }));
  }

  function toggleType(value: string) {
    const selected = report.incidentTypes.includes(value);
    update("incidentTypes", selected ? report.incidentTypes.filter((item) => item !== value) : [...report.incidentTypes, value]);
    if (value === "Property damage/destruction") {
      updatePropertyDamage({ involved: !selected });
    }
  }

  function updatePropertyDamage(patch: Partial<PropertyDamageDetails>) {
    update("propertyDamage", { ...report.propertyDamage, ...patch });
  }

  function togglePropertyDamageBodilyInjury(involved: boolean) {
    setReport((current) => ({
      ...current,
      incidentTypes: involved
        ? Array.from(new Set([...current.incidentTypes, "Injury"]))
        : current.templateId === "propertyDamage"
          ? current.incidentTypes.filter((type) => type !== "Injury")
          : current.incidentTypes,
      propertyDamage: {
        ...current.propertyDamage,
        bodilyInjury: involved
      },
      markers: !involved && current.templateId === "propertyDamage" ? [] : current.markers
    }));

    if (!involved && report.templateId === "propertyDamage") {
      setSelectedMarkerId("");
      setBodyMapExpanded(false);
    }
  }

  function updateSpecificDetail(field: keyof IncidentSpecificDetails, value: string) {
    update("specificDetails", { ...report.specificDetails, [field]: value });
  }

  function togglePropertyDamageItem(value: string) {
    const items = report.propertyDamage.items.includes(value)
      ? report.propertyDamage.items.filter((item) => item !== value)
      : [...report.propertyDamage.items, value];

    updatePropertyDamage({ involved: true, items });
    if (!report.incidentTypes.includes("Property damage/destruction")) {
      update("incidentTypes", [...report.incidentTypes, "Property damage/destruction"]);
    }
  }

  function addMarker(view: BodyView, x: number, y: number, area: string) {
    const marker: BodyMarker = {
      id: `marker-${Date.now()}`,
      view,
      x,
      y,
      area,
      injury: "Pain",
      severity: "To be assessed",
      notes: `Marker added to ${area.toLowerCase()} on the ${view} body-map view. Add visible signs, size, colour, pain reported, first aid, and monitoring details.`
    };
    update("markers", [...report.markers, marker]);
    setSelectedMarkerId(marker.id);
  }

  function updateMarker(patch: Partial<BodyMarker>) {
    if (!selectedMarker) return;
    update("markers", report.markers.map((marker) => marker.id === selectedMarker.id ? { ...marker, ...patch } : marker));
  }

  function deleteMarker(id: string) {
    const remaining = report.markers.filter((marker) => marker.id !== id);
    update("markers", remaining);
    setSelectedMarkerId(remaining[0]?.id ?? "");
  }

  function addAttachment() {
    update("attachments", [...report.attachments, { id: `attachment-${Date.now()}`, name: "supporting-file.pdf", type: "Medical / body map / photo", notes: "Store against this specific client and incident record." }]);
  }

  async function saveDraft() {
    const savedIso = new Date().toISOString();
    const result = await saveTenantRetainedRecord({
      id: `incident-${report.incidentId}`,
      type: "incident-report",
      title: `Incident Report - ${report.incidentId}`,
      body: exportText,
      savedAt: savedIso
    });
    window.localStorage.setItem(`empowernotes-incident:${report.incidentId}`, exportText);
    setSavedAt(new Date(savedIso).toLocaleString("en-AU"));
    setSaveMessage(result.savedToCloud ? "Incident saved to this organisation." : "Incident saved locally. Sign in to save it to this organisation's Supabase space.");
    window.dispatchEvent(new Event("empowernotes:retained-records-updated"));
    markTrialStepComplete("incident-report");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:sticky lg:top-4 lg:self-start">
        <p className="text-xs font-semibold uppercase text-slate-500">Incident</p>
        <h2 className="mt-1 text-xl font-bold text-ink">{report.incidentId}</h2>
        <span className="mt-3 inline-flex rounded-md bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900">{report.status}</span>
        <div className="mt-5 grid gap-2 text-sm text-slate-600">
          <p>Participant: <strong className="text-ink">{report.participant}</strong></p>
          <p>Reporter: <strong className="text-ink">{report.reporter}</strong></p>
          <p>{savedAt ? `Saved ${savedAt}` : "Unsaved local draft"}</p>
        </div>
        {saveMessage ? <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{saveMessage}</p> : null}
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={saveDraft} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift"><Save size={17} />Save draft</button>
          <button type="button" onClick={() => update("status", "Submitted")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift"><Send size={17} />Submit</button>
          <button type="button" onClick={() => update("status", "Needs Review")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900"><ShieldCheck size={17} />Manager review</button>
          <button type="button" onClick={() => update("status", "Locked")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink"><Lock size={17} />Lock report</button>
        </div>
      </aside>

      <div className="grid gap-5">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">Structured incident workflow</p>
              <h2 className="mt-1 text-2xl font-bold text-ink">Incident report</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400"><Download size={17} />Print / PDF</button>
            </div>
          </div>
          <p className="mt-4 rounded-md bg-sky-50 p-3 text-sm leading-6 text-sky-900">EmpowerNotes assists with documentation quality and evidence organisation. It does not replace professional judgement, legal advice, clinical judgement, safeguarding assessment, or compliance obligations.</p>
        </section>

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Incident type</p>
            <h3 className="mt-1 text-xl font-bold text-ink">Choose the right report template</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">The selected template controls which prompts appear below. Staff can still add extra classifications if the incident involves more than one issue.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {incidentTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                className={`rounded-md border p-4 text-left transition focus:outline focus:outline-2 focus:outline-teal-700 ${report.templateId === template.id ? "border-teal-600 bg-teal-50 shadow-lift" : "border-slate-200 bg-slate-50 hover:border-teal-300"}`}
                aria-pressed={report.templateId === template.id}
              >
                <span className="block font-bold text-ink">{template.title}</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">{template.detail}</span>
              </button>
            ))}
          </div>
          <div className="rounded-md border border-teal-100 bg-teal-50 p-3">
            <p className="text-sm font-semibold text-teal-950">Active template: {activeTemplate.title}</p>
            <p className="mt-1 text-sm leading-6 text-teal-900">{activeTemplate.detail}</p>
          </div>
        </section>

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-xl font-bold text-ink">Incident basics</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Incident ID" value={report.incidentId} onChange={(value) => update("incidentId", value)} />
            <Field label="Participant/client" value={report.participant} onChange={(value) => update("participant", value)} />
            <Field label="Date" type="date" value={report.date} onChange={(value) => update("date", value)} />
            <Field label="Time" type="time" value={report.time} onChange={(value) => update("time", value)} />
            <Field label="Location" value={report.location} onChange={(value) => update("location", value)} />
            <Field label="Completed by" value={report.reporter} onChange={(value) => update("reporter", value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {incidentTypes.map((type) => (
              <label key={type} className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={report.incidentTypes.includes(type)} onChange={() => toggleType(type)} />
                {type}
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-xl font-bold text-ink">{activeTemplate.title} narrative and response</h3>
          <TextArea label="What happened" value={report.whatHappened} onChange={(value) => update("whatHappened", value)} />
          <TextArea label="Injury / harm summary" value={report.injurySummary} onChange={(value) => update("injurySummary", value)} />
          <TextArea label="Immediate response" value={report.immediateAction} onChange={(value) => update("immediateAction", value)} />
          <TextArea label="Notifications" value={report.notifications} onChange={(value) => update("notifications", value)} />
        </section>

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Template prompts</p>
            <h3 className="mt-1 text-xl font-bold text-ink">{activeTemplate.title} specific details</h3>
          </div>
          <div className="grid gap-4">
            {activeTemplate.fields.map((field) => (
              <TextArea
                key={field.key}
                label={field.label}
                value={report.specificDetails[field.key]}
                onChange={(value) => updateSpecificDetail(field.key, value)}
                rows={field.rows}
              />
            ))}
          </div>
        </section>

        {showPropertyDamage ? (
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-ink">Property damage / destruction</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">Record damage to vehicles, houses, furniture, equipment, personal belongings, or other property linked to the incident.</p>
            </div>
            <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={report.propertyDamage.involved}
                onChange={(event) => {
                  const involved = event.target.checked;
                  updatePropertyDamage({ involved });
                  if (involved && !report.incidentTypes.includes("Property damage/destruction")) {
                    update("incidentTypes", [...report.incidentTypes, "Property damage/destruction"]);
                  }
                  if (!involved && report.incidentTypes.includes("Property damage/destruction")) {
                    update("incidentTypes", report.incidentTypes.filter((type) => type !== "Property damage/destruction"));
                  }
                }}
              />
              Property damage involved
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {propertyDamageItems.map((item) => (
              <label key={item} className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={report.propertyDamage.items.includes(item)} onChange={() => togglePropertyDamageItem(item)} />
                {item}
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Other property item" value={report.propertyDamage.otherItem} onChange={(value) => updatePropertyDamage({ otherItem: value })} />
            <Field label="Estimated cost / value if known" value={report.propertyDamage.estimatedCost} onChange={(value) => updatePropertyDamage({ estimatedCost: value })} />
          </div>
          <TextArea label="Property damage details" value={report.propertyDamage.description} onChange={(value) => updatePropertyDamage({ description: value })} />
          <TextArea label="Immediate action for property damage" value={report.propertyDamage.immediateAction} onChange={(value) => updatePropertyDamage({ immediateAction: value })} />
          <div className="rounded-md border border-red-100 bg-red-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Bodily injury check</p>
                <h4 className="mt-1 text-lg font-bold text-ink">Did bodily injury also occur?</h4>
                <p className="mt-1 text-sm leading-6 text-slate-700">Choose yes if anyone had pain, bruising, swelling, a cut, redness, skin damage, or any reported/observed injury connected to the property damage incident.</p>
              </div>
              <div className="flex rounded-md border border-red-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => togglePropertyDamageBodilyInjury(true)}
                  className={`min-h-10 rounded px-4 text-sm font-bold ${report.propertyDamage.bodilyInjury ? "bg-red-600 text-white" : "text-slate-700 hover:bg-red-50"}`}
                  aria-pressed={report.propertyDamage.bodilyInjury}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => togglePropertyDamageBodilyInjury(false)}
                  className={`min-h-10 rounded px-4 text-sm font-bold ${!report.propertyDamage.bodilyInjury ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  aria-pressed={!report.propertyDamage.bodilyInjury}
                >
                  No
                </button>
              </div>
            </div>
            {report.propertyDamage.bodilyInjury ? (
              <div className="mt-4 grid gap-4">
                <TextArea
                  label="Bodily injury details linked to property damage"
                  value={report.propertyDamage.bodilyInjuryDescription}
                  onChange={(value) => updatePropertyDamage({ bodilyInjuryDescription: value })}
                  rows={4}
                />
                <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-800">The body map is now available below. Add markers for each injury site and complete the marker details.</p>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {showBodyMap ? (
        <section className={`${bodyMapExpanded ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-white"} grid gap-4 rounded-md border p-5 shadow-soft transition-all`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-ink">Body map</h3>
              <p className="mt-1 text-sm text-slate-600">Click the front, side, or back figure to add a marker, then update the details below.</p>
            </div>
            <button
              type="button"
              onClick={() => setBodyMapExpanded((current) => !current)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink shadow-sm"
              aria-expanded={bodyMapExpanded}
            >
              {bodyMapExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {bodyMapExpanded ? "Close larger view" : "Open larger view"}
            </button>
          </div>
          {bodyMapExpanded ? (
            <div className="rounded-md border border-teal-100 bg-white px-3 py-2 text-sm font-semibold text-teal-900">
              Larger view is open for clearer injury placement.
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
            <aside className="grid gap-4 rounded-md border border-red-100 bg-red-50 p-4 xl:self-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Injury marker details</p>
                <h4 className="mt-1 text-lg font-bold text-ink">{selectedMarker ? `${selectedMarker.area} - ${selectedMarker.injury}` : "Select or add a marker"}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">Click the expanded body map on the right to add a marker, or click an existing red marker to edit it here.</p>
                <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-red-800">Smart autofill suggests the body area from where the marker is placed. Staff should confirm and edit before saving.</p>
              </div>
              {selectedMarker ? (
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>Body area</span><select value={selectedMarker.area} onChange={(event) => updateMarker({ area: event.target.value })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">{bodyAreas.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>Injury type</span><select value={selectedMarker.injury} onChange={(event) => updateMarker({ injury: event.target.value })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">{injuryTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <Field label="Severity" value={selectedMarker.severity} onChange={(value) => updateMarker({ severity: value })} />
                  <TextArea label="Marker notes" value={selectedMarker.notes} onChange={(value) => updateMarker({ notes: value })} />
                  <button type="button" onClick={() => deleteMarker(selectedMarker.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700"><Trash2 size={17} />Delete marker</button>
                </div>
              ) : null}
            </aside>
            <div className="min-w-0">
              <BodyMap markers={report.markers} expanded={bodyMapExpanded} onAdd={addMarker} onSelect={setSelectedMarkerId} />
            </div>
          </div>
        </section>
        ) : null}

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-xl font-bold text-ink">Follow-up and manager review</h3>
          <TextArea label="Follow-up required" value={report.followUp} onChange={(value) => update("followUp", value)} />
          <TextArea label="Manager review notes" value={report.managerReview} onChange={(value) => update("managerReview", value)} />
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">This may require manager review for possible escalation or reportable incident assessment.</p>
        </section>

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-ink">Client-specific attachments</h3>
            <button type="button" onClick={addAttachment} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift"><Plus size={17} />Add attachment</button>
          </div>
          <div className="grid gap-3">
            {report.attachments.map((attachment) => (
              <div key={attachment.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <Field label="File name" value={attachment.name} onChange={(value) => update("attachments", report.attachments.map((item) => item.id === attachment.id ? { ...item, name: value } : item))} />
                <Field label="Type" value={attachment.type} onChange={(value) => update("attachments", report.attachments.map((item) => item.id === attachment.id ? { ...item, type: value } : item))} />
                <Field label="Notes" value={attachment.notes} onChange={(value) => update("attachments", report.attachments.map((item) => item.id === attachment.id ? { ...item, notes: value } : item))} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
