"use client";

import { useMemo, useState } from "react";
import { Download, Lock, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";

type BodyView = "front" | "back";
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
    { id: "marker-1", view: "front", x: 61, y: 34, area: "Left arm", injury: "Bruise", severity: "Mild", notes: "Approx. 3cm purple/blue bruising observed." },
    { id: "marker-2", view: "back", x: 57, y: 31, area: "Upper back", injury: "Redness", severity: "Mild", notes: "Approx. 4cm red area observed, no open skin." }
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

function HumanBodyFigure({ view }: { view: BodyView }) {
  const gradientId = `incident-body-${view}`;
  const guide = view === "front";

  return (
    <svg aria-hidden="true" viewBox="0 0 240 520" className="pointer-events-none h-full max-h-[450px] w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef6f8" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradientId})`} stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <path d="M94 91c5 16 47 16 52 0l3 31c20 5 35 17 43 34l24 95c3 12-4 24-16 27-11 2-21-4-25-15l-21-68-5 84 17 178c1 15-9 28-24 29-13 1-24-8-27-21l-16-129-16 129c-3 13-14 22-27 21-15-1-25-14-24-29l17-178-5-84-21 68c-4 11-14 17-25 15-12-3-19-15-16-27l24-95c8-17 23-29 43-34l3-31Z" />
        <ellipse cx="120" cy="54" rx="33" ry="39" />
        <path d="M96 488c14 7 34 7 48 0l10 13c-9 9-24 13-34 11-10 2-25-2-34-11l10-13Z" />
      </g>
      <g fill="none" stroke="#cbd5e1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M85 129c19 12 51 12 70 0" />
        <path d="M83 279c22 11 52 11 74 0" />
        <path d="M92 305c14 13 42 13 56 0" />
        <path d="M70 191c15 15 30 22 50 22s35-7 50-22" />
        <path d="M83 335c10 12 26 17 37 17s27-5 37-17" />
        <path d="M57 279c-11 20-14 45-8 75" />
        <path d="M183 279c11 20 14 45 8 75" />
      </g>
      {guide ? (
        <g fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.75">
          <path d="M106 51c4-3 9-3 13 0" />
          <path d="M128 51c4-3 9-3 13 0" />
          <path d="M113 69c5 4 10 4 15 0" />
          <path d="M120 137v138" strokeDasharray="5 7" />
          <path d="M98 162c8 8 36 8 44 0" />
          <path d="M101 220c9 6 29 6 38 0" />
        </g>
      ) : (
        <g fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.75">
          <path d="M120 95v184" strokeDasharray="5 7" />
          <path d="M91 158c13-13 27-17 43-11" />
          <path d="M149 158c-13-13-27-17-43-11" />
          <path d="M93 197c18 12 36 12 54 0" />
          <path d="M96 259c17 10 31 10 48 0" />
        </g>
      )}
      <g fill="#64748b" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0">
        <text x="21" y="161">arm</text>
        <text x="176" y="161">arm</text>
        <text x="100" y="188">{guide ? "chest" : "back"}</text>
        <text x="91" y="249">{guide ? "abdomen" : "lower back"}</text>
        <text x="57" y="398">leg</text>
        <text x="159" y="398">leg</text>
      </g>
    </svg>
  );
}

function BodyMap({ view, markers, onAdd, onSelect }: { view: BodyView; markers: BodyMarker[]; onAdd: (view: BodyView, x: number, y: number) => void; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onAdd(view, Math.round(((event.clientX - rect.left) / rect.width) * 100), Math.round(((event.clientY - rect.top) / rect.height) * 100));
      }}
      className="relative min-h-[460px] overflow-hidden rounded-md border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-left shadow-inner"
      aria-label={`Add ${view} body marker`}
    >
      <div className="absolute inset-4 flex items-center justify-center">
        <HumanBodyFigure view={view} />
      </div>
      <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-xs font-bold uppercase text-slate-600 shadow-sm">{view}</span>
      {markers.filter((marker) => marker.view === view).map((marker) => (
        <span
          key={marker.id}
          role="button"
          tabIndex={0}
          onClick={(event) => { event.stopPropagation(); onSelect(marker.id); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(marker.id); }}
          className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-red-600 text-xs font-bold text-white shadow-lift ring-4 ring-red-100"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          title={`${marker.area}: ${marker.injury}`}
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

        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div>
            <h3 className="text-xl font-bold text-ink">Body map</h3>
            <p className="mt-1 text-sm text-slate-600">Click the front or back figure to add a marker, then update the details below.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <BodyMap view="front" markers={report.markers} onAdd={addMarker} onSelect={setSelectedMarkerId} />
            <BodyMap view="back" markers={report.markers} onAdd={addMarker} onSelect={setSelectedMarkerId} />
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
