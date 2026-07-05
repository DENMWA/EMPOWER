"use client";

import { useMemo, useState } from "react";
import { Download, Lock, Maximize2, Minimize2, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";

type BodyView = "front" | "left" | "right" | "back";
type Status = "Draft" | "Submitted" | "Needs Review" | "Locked";

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

type IncidentReport = {
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
  markers: BodyMarker[];
  attachments: Attachment[];
};

const incidentTypes = ["Fall", "Injury", "Medication incident", "Behaviour/distress incident", "Near miss", "Safeguarding concern", "Medical event", "Other"];
const bodyAreas = ["Head", "Face", "Neck", "Left arm", "Right arm", "Chest", "Abdomen", "Upper back", "Lower back", "Left leg", "Right leg", "Left foot", "Right foot", "Other"];
const injuryTypes = ["Bruise", "Cut", "Swelling", "Redness", "Pain", "Scratch", "Skin tear", "Other"];

const initialReport: IncidentReport = {
  incidentId: "INC-2026-0007",
  date: "2026-06-25",
  time: "09:35",
  location: "Bathroom doorway, supported accommodation",
  participant: "Sarah T.",
  reporter: "Mary Wanjiku",
  status: "Draft",
  incidentTypes: ["Fall", "Injury"],
  whatHappened: "Participant slipped while walking to the bathroom and fell to the floor. Staff supported the participant to remain calm, checked for visible injury, provided first aid, notified the manager, and commenced monitoring.",
  injurySummary: "Bruising observed on left upper arm and redness observed on right upper back.",
  immediateAction: "Staff checked visible injury, provided reassurance, offered first aid, made the area safe, notified the manager, and commenced monitoring.",
  notifications: "Manager notified at 09:50. Case manager notified through internal handover note.",
  followUp: "Monitor pain, review bathroom threshold risk, and update the support plan if required.",
  managerReview: "Pending manager review. Consider whether escalation or reportable incident assessment is required.",
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

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" />
    </label>
  );
}

function getBodyViewFromPoint(x: number): BodyView {
  if (x < 25) return "front";
  if (x < 50) return "left";
  if (x < 75) return "right";
  return "back";
}

function ClinicalBodyChart() {
  return (
    <svg aria-hidden="true" viewBox="0 0 640 420" className="pointer-events-none h-full w-full">
      <g fill="none" stroke="#334155" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
        <g transform="translate(36 22)">
          <ellipse cx="48" cy="34" rx="18" ry="25" />
          <path d="M31 54c-5 16-5 32 2 45" />
          <path d="M65 54c5 16 5 32-2 45" />
          <path d="M32 88c-8 20-13 46-17 82-2 18-8 42-14 65" />
          <path d="M64 88c8 20 13 46 17 82 2 18 8 42 14 65" />
          <path d="M31 92c-9 28-12 83-12 132 0 55 10 95 10 128" />
          <path d="M65 92c9 28 12 83 12 132 0 55-10 95-10 128" />
          <path d="M48 119c-9 52-9 101 0 148" />
          <path d="M48 268c-15 34-24 63-26 100" />
          <path d="M48 268c15 34 24 63 26 100" />
          <path d="M29 352c-9 7-16 11-24 10" />
          <path d="M67 352c9 7 16 11 24 10" />
          <path d="M2 235c4 12 10 17 19 15" />
          <path d="M94 235c-4 12-10 17-19 15" />
          <path d="M40 366c-10 12-23 16-34 12" />
          <path d="M56 366c10 12 23 16 34 12" />
        </g>
        <g transform="translate(190 22)">
          <ellipse cx="45" cy="35" rx="17" ry="24" />
          <path d="M31 45c16-8 28-5 37 10" />
          <path d="M48 60c-9 30-12 72-9 126" />
          <path d="M39 91c-24 12-38 40-41 85" />
          <path d="M44 91c29 20 44 49 45 87" />
          <path d="M4 177c9 13 19 16 31 9" />
          <path d="M88 178c-1 25 4 46 15 64" />
          <path d="M40 185c-9 40-9 92-2 156" />
          <path d="M52 184c17 52 27 108 29 167" />
          <path d="M38 341c-9 16-17 24-30 24" />
          <path d="M81 351c9 12 20 16 33 15" />
          <path d="M45 67c7 6 10 14 9 24" />
        </g>
        <g transform="translate(342 22)">
          <ellipse cx="45" cy="35" rx="17" ry="24" />
          <path d="M59 45c-16-8-28-5-37 10" />
          <path d="M42 60c9 30 12 72 9 126" />
          <path d="M51 91c24 12 38 40 41 85" />
          <path d="M46 91c-29 20-44 49-45 87" />
          <path d="M86 177c-9 13-19 16-31 9" />
          <path d="M2 178c1 25-4 46-15 64" />
          <path d="M50 185c9 40 9 92 2 156" />
          <path d="M38 184c-17 52-27 108-29 167" />
          <path d="M52 341c9 16 17 24 30 24" />
          <path d="M9 351c-9 12-20 16-33 15" />
          <path d="M45 67c-7 6-10 14-9 24" />
        </g>
        <g transform="translate(506 22)">
          <ellipse cx="48" cy="34" rx="18" ry="25" />
          <path d="M31 55c-4 18-3 34 2 48" />
          <path d="M65 55c4 18 3 34-2 48" />
          <path d="M33 96c-9 24-14 62-15 115-1 39-5 78-9 118" />
          <path d="M63 96c9 24 14 62 15 115 1 39 5 78 9 118" />
          <path d="M18 119c-12 35-17 72-16 111" />
          <path d="M78 119c12 35 17 72 16 111" />
          <path d="M48 103c-4 40-3 82 0 127" />
          <path d="M48 232c-16 37-25 83-26 137" />
          <path d="M48 232c16 37 25 83 26 137" />
          <path d="M9 329c-4 11-11 18-21 20" />
          <path d="M87 329c4 11 11 18 21 20" />
          <path d="M37 365c-8 11-19 15-32 12" />
          <path d="M59 365c8 11 19 15 32 12" />
        </g>
      </g>
      <g fill="#64748b" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" letterSpacing="0">
        <text x="64" y="405">Front</text>
        <text x="208" y="405">Left side</text>
        <text x="358" y="405">Right side</text>
        <text x="528" y="405">Back</text>
      </g>
    </svg>
  );
}

function BodyMap({ markers, expanded, onAdd, onSelect }: { markers: BodyMarker[]; expanded?: boolean; onAdd: (view: BodyView, x: number, y: number) => void; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
        onAdd(getBodyViewFromPoint(x), x, y);
      }}
      className={`${expanded ? "min-h-[560px]" : "min-h-[430px]"} relative block w-full overflow-hidden rounded-md border border-slate-300 bg-white text-left shadow-inner transition-all`}
      aria-label="Add body map marker"
    >
      <div className="absolute inset-4 flex items-center justify-center rounded-md bg-slate-50">
        <ClinicalBodyChart />
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
  const [bodyMapExpanded, setBodyMapExpanded] = useState(false);

  const selectedMarker = report.markers.find((marker) => marker.id === selectedMarkerId);
  const exportText = useMemo(() => JSON.stringify(report, null, 2), [report]);

  function update<K extends keyof IncidentReport>(field: K, value: IncidentReport[K]) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function toggleType(value: string) {
    update("incidentTypes", report.incidentTypes.includes(value) ? report.incidentTypes.filter((item) => item !== value) : [...report.incidentTypes, value]);
  }

  function addMarker(view: BodyView, x: number, y: number) {
    const marker: BodyMarker = { id: `marker-${Date.now()}`, view, x, y, area: "Other", injury: "Pain", severity: "Unknown", notes: "" };
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

  function saveDraft() {
    window.localStorage.setItem(`empowernotes-incident:${report.incidentId}`, exportText);
    setSavedAt(new Date().toLocaleString("en-AU"));
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
          <h3 className="text-xl font-bold text-ink">Narrative and response</h3>
          <TextArea label="What happened" value={report.whatHappened} onChange={(value) => update("whatHappened", value)} />
          <TextArea label="Injury / harm summary" value={report.injurySummary} onChange={(value) => update("injurySummary", value)} />
          <TextArea label="Immediate response" value={report.immediateAction} onChange={(value) => update("immediateAction", value)} />
          <TextArea label="Notifications" value={report.notifications} onChange={(value) => update("notifications", value)} />
        </section>

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
          <div>
            <BodyMap markers={report.markers} expanded={bodyMapExpanded} onAdd={addMarker} onSelect={setSelectedMarkerId} />
          </div>
          {selectedMarker ? (
            <div className="grid gap-4 rounded-md border border-red-100 bg-red-50 p-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>Body area</span><select value={selectedMarker.area} onChange={(event) => updateMarker({ area: event.target.value })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">{bodyAreas.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>Injury type</span><select value={selectedMarker.injury} onChange={(event) => updateMarker({ injury: event.target.value })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">{injuryTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <Field label="Severity" value={selectedMarker.severity} onChange={(value) => updateMarker({ severity: value })} />
              <button type="button" onClick={() => deleteMarker(selectedMarker.id)} className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700"><Trash2 size={17} />Delete marker</button>
              <div className="md:col-span-2"><TextArea label="Marker notes" value={selectedMarker.notes} onChange={(value) => updateMarker({ notes: value })} /></div>
            </div>
          ) : null}
        </section>

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
