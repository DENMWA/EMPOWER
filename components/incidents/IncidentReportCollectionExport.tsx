"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { isDemoModeEnabled } from "@/lib/presentation-mode";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

type StoredIncidentReport = {
  incidentId: string;
  participantId: string;
  houseId: string;
  houseName: string;
  date: string;
  time: string;
  location: string;
  participant: string;
  reporter: string;
  status: string;
  incidentTypes: string[];
  whatHappened: string;
  injurySummary: string;
  immediateAction: string;
  notifications: string;
  followUp: string;
  managerReview: string;
  propertyDamage?: {
    involved: boolean;
    items: string[];
    otherItem: string;
    description: string;
    estimatedCost: string;
    immediateAction: string;
  };
  markers?: Array<{
    area: string;
    injury: string;
    severity: string;
    notes: string;
  }>;
  attachments?: Array<{
    name: string;
    type: string;
    notes: string;
  }>;
};

const sampleIncidentReports: StoredIncidentReport[] = [
  {
    incidentId: "INC-2026-0007",
    participantId: "client-d",
    houseId: "demo-house",
    houseName: "Demo House",
    date: "2026-06-25",
    time: "09:35",
    location: "Bathroom doorway, supported accommodation",
    participant: "Client D",
    reporter: "Support Worker A",
    status: "Needs Review",
    incidentTypes: ["Fall", "Injury"],
    whatHappened: "Participant slipped while walking to the bathroom and fell to the floor. Staff supported the participant to remain calm, checked for visible injury, provided first aid, notified the manager, and commenced monitoring.",
    injurySummary: "Bruising observed on left upper arm and redness observed on right upper back.",
    immediateAction: "Staff checked visible injury, provided reassurance, offered first aid, made the area safe, notified the manager, and commenced monitoring.",
    notifications: "Manager notified at 09:50. Case manager notified through internal handover note.",
    followUp: "Monitor pain, review bathroom threshold risk, and update the support plan if required.",
    managerReview: "Pending manager review. Consider whether escalation or reportable incident assessment is required.",
    propertyDamage: {
      involved: false,
      items: [],
      otherItem: "",
      description: "",
      estimatedCost: "",
      immediateAction: ""
    },
    markers: [
      { area: "Left arm", injury: "Bruise", severity: "Mild", notes: "Approx. 3cm purple/blue bruising observed." },
      { area: "Upper back", injury: "Redness", severity: "Mild", notes: "Approx. 4cm red area observed, no open skin." }
    ],
    attachments: [{ name: "fall-body-map-export.pdf", type: "Body map export", notes: "Attach body map/photo evidence to the participant incident record in production." }]
  }
];

function getStoredIncidentReports() {
  if (typeof window === "undefined") return [];
  if (isDemoModeEnabled()) return [];

  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("empowernotes-incident:"))
    .map((key) => {
      try {
        const report = JSON.parse(window.localStorage.getItem(key) || "") as StoredIncidentReport;
        return { ...report, participantId: report.participantId || "unassigned-client", houseId: report.houseId || "unassigned-house", houseName: report.houseName || "Unassigned house/service" };
      } catch {
        return null;
      }
    })
    .filter((report): report is StoredIncidentReport => Boolean(report?.incidentId && report.date));
}

function incidentFromRetainedRecord(record: RetainedRecord) {
  try {
    const report = JSON.parse(record.body) as StoredIncidentReport;
    return { ...report, participantId: report.participantId || "unassigned-client", houseId: report.houseId || "unassigned-house", houseName: report.houseName || "Unassigned house/service" };
  } catch {
    return null;
  }
}

function formatIncidentReport(report: StoredIncidentReport) {
  const markers = report.markers?.length
    ? report.markers.map((marker) => `${marker.area}: ${marker.injury}, ${marker.severity}. ${marker.notes}`).join("; ")
    : "No body map markers recorded.";

  const attachments = report.attachments?.length
    ? report.attachments.map((attachment) => `${attachment.name} (${attachment.type}) - ${attachment.notes}`).join("; ")
    : "No attachments recorded.";

  const propertyDamage = report.propertyDamage?.involved
    ? [
        `Items: ${[...(report.propertyDamage.items || []), report.propertyDamage.otherItem].filter(Boolean).join(", ") || "Not specified"}`,
        `Details: ${report.propertyDamage.description || "Not recorded"}`,
        `Estimated cost/value: ${report.propertyDamage.estimatedCost || "Not recorded"}`,
        `Immediate action: ${report.propertyDamage.immediateAction || "Not recorded"}`
      ].join("; ")
    : "No property damage recorded.";

  return [
    `Incident ID: ${report.incidentId}`,
    `Date/time: ${report.date} ${report.time}`,
    `Client: ${report.participant}`,
    `Client ID: ${report.participantId}`,
    `House/service: ${report.houseName}`,
    `House/service ID: ${report.houseId}`,
    `Reporter: ${report.reporter}`,
    `Location: ${report.location}`,
    `Status: ${report.status}`,
    `Incident type(s): ${report.incidentTypes.join(", ") || "Not selected"}`,
    "",
    `What happened: ${report.whatHappened}`,
    `Injury/harm summary: ${report.injurySummary}`,
    `Immediate response: ${report.immediateAction}`,
    `Property damage/destruction: ${propertyDamage}`,
    `Notifications: ${report.notifications}`,
    `Follow-up: ${report.followUp}`,
    `Manager review: ${report.managerReview}`,
    `Body map markers: ${markers}`,
    `Attachments: ${attachments}`
  ].join("\n");
}

export function IncidentReportCollectionExport() {
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-06-30");
  const [includeSavedDrafts, setIncludeSavedDrafts] = useState(true);
  const [retainedIncidentReports, setRetainedIncidentReports] = useState<StoredIncidentReport[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    function loadRecords() {
      getTenantRetainedRecords("incident-report")
        .then((records) => setRetainedIncidentReports(records.map(incidentFromRetainedRecord).filter((report): report is StoredIncidentReport => Boolean(report?.incidentId && report.date))))
        .catch(() => setRetainedIncidentReports([]));
    }

    loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  useEffect(() => {
    function syncDataMode() {
      setDemoMode(isDemoModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  const sampleReportsInRange = useMemo(() => {
    return demoMode ? sampleIncidentReports.filter((report) => report.date >= fromDate && report.date <= toDate) : [];
  }, [demoMode, fromDate, toDate]);

  function downloadCollection() {
    const storedReports = includeSavedDrafts
      ? [...retainedIncidentReports, ...getStoredIncidentReports()]
          .filter((report, index, reports) => reports.findIndex((item) => `${item.participantId}-${item.houseId}-${item.incidentId}` === `${report.participantId}-${report.houseId}-${report.incidentId}`) === index)
          .filter((report) => report.date >= fromDate && report.date <= toDate)
      : [];

    const reports = [...sampleReportsInRange, ...storedReports];
    const content = [
      `Period: ${fromDate} to ${toDate}`,
      `Exported: ${new Date().toLocaleString("en-AU")}`,
      "",
      reports.map(formatIncidentReport).join("\n\n---\n\n") || "No incident reports found for this period."
    ].join("\n");

    downloadOrganisationReportHtml(`empowernotes-incident-reports-${fromDate}-to-${toDate}.html`, "EmpowerNotes Incident Report Collection", content);
  }

  return (
    <Card className="border-amber-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Collection export</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Download incident reports by period</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Incident downloads are grouped by date range for manager review, trend reporting, audit packs, and safeguarding follow-up.
          </p>
        </div>
        <StatusBadge label={`${sampleReportsInRange.length + retainedIncidentReports.length} available reports`} tone="amber" />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          From
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          To
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3" />
        </label>
        <button type="button" onClick={downloadCollection} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <Download size={17} aria-hidden="true" />
          Download collection
        </button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={includeSavedDrafts} onChange={(event) => setIncludeSavedDrafts(event.target.checked)} />
        Include locally saved incident drafts from this browser.
      </label>
    </Card>
  );
}
