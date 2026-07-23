"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { getRosterSummary } from "@/lib/roster";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import { participants, progressNotes, users } from "@/lib/sample-data";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, FileWarning, FolderLock, LockKeyhole, Mic, ShieldCheck, TrendingUp } from "lucide-react";
import { isDemoModeEnabled } from "@/lib/presentation-mode";

const workerActions = [
  { label: "Create progress note", detail: "Structured support record", href: "/notes/new", icon: ClipboardList },
  { label: "Record voice note", detail: "Speak naturally on shift", href: "/notes/new#voice", icon: Mic },
  { label: "New incident report", detail: "Structured event capture", href: "/incidents/new", icon: ShieldCheck },
  { label: "Documents", detail: "Upload to a client file", href: "/documents", icon: FolderLock }
];

export function ManagerDashboardCards() {
  const [savedNotes, setSavedNotes] = useState<RetainedRecord[]>([]);
  const [incidents, setIncidents] = useState<StoredIncidentReport[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    function loadRecords() {
      getTenantRetainedRecords("progress-note").then(setSavedNotes).catch(() => setSavedNotes([]));
      getSavedIncidentReports().then((items) => setIncidents(items.map((item) => item.report))).catch(() => setIncidents([]));
    }

    loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  useEffect(() => {
    function syncMode() {
      setDemoMode(isDemoModeEnabled());
    }

    syncMode();
    window.addEventListener("empowernotes:data-mode-updated", syncMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncMode);
  }, []);

  const liveReviewSignals = savedNotes.map((note) => getNoteReviewSignals(note.body));
  const weakNotes = liveReviewSignals.filter((signals) => signals.missingDetails.length || signals.riskyWordingFlags.length);
  const submittedIncidents = incidents.filter((incident) => incident.status === "Submitted" || incident.status === "Needs Review");
  const invoiceReadyCount = liveReviewSignals.filter((signals) => !signals.missingDetails.length && !signals.riskyWordingFlags.length).length;
  const invoiceScore = savedNotes.length ? Math.round((invoiceReadyCount / savedNotes.length) * 100) : demoMode ? 68 : 0;
  const managerStats = savedNotes.length || incidents.length || !demoMode
    ? [
        { label: "Notes awaiting review", value: String(savedNotes.length), detail: `${weakNotes.length} need manager attention`, icon: ClipboardList, tone: "bg-sky-50 text-sky-800" },
        { label: "Weak notes needing improvement", value: String(weakNotes.length), detail: savedNotes.length ? "Based on missing detail and risky wording signals" : "Save notes to build the queue", icon: FileWarning, tone: "bg-amber-50 text-amber-800" },
        { label: "Incident reports awaiting review", value: String(submittedIncidents.length), detail: `${incidents.length} incident records checked`, icon: AlertTriangle, tone: "bg-red-50 text-red-700" },
        { label: "Invoice-readiness summary", value: `${invoiceScore}%`, detail: `${invoiceReadyCount} notes ready, ${Math.max(savedNotes.length - invoiceReadyCount, 0)} need evidence`, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }
      ]
    : [
        { label: "Notes awaiting review", value: "12", detail: "4 include voice transcripts", icon: ClipboardList, tone: "bg-sky-50 text-sky-800" },
        { label: "Weak notes needing improvement", value: "7", detail: "Average audit readiness 62%", icon: FileWarning, tone: "bg-amber-50 text-amber-800" },
        { label: "Incident reports awaiting review", value: "3", detail: "1 possible escalation flag", icon: AlertTriangle, tone: "bg-red-50 text-red-700" },
        { label: "Invoice-readiness summary", value: "68%", detail: "18 notes ready, 9 need evidence", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }
      ];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {managerStats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-600 to-sky-500" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-ink">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-600">{stat.detail}</p>
              </div>
              <span className={`grid h-11 w-11 place-items-center rounded-md ${stat.tone}`}>
                <Icon aria-hidden="true" size={21} />
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function WorkerDashboardCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {workerActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.label} href={action.href} className="group rounded-md border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-lift focus:outline focus:outline-2 focus:outline-teal-700">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-mint text-teal-900 transition group-hover:bg-teal-700 group-hover:text-white">
              <Icon aria-hidden="true" size={20} />
            </span>
            <p className="mt-4 text-lg font-semibold text-ink">{action.label}</p>
            <p className="mt-1 text-sm text-slate-600">{action.detail}</p>
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardOperationalLists() {
  const rosterSummary = getRosterSummary();
  const [savedNotes, setSavedNotes] = useState<RetainedRecord[]>([]);
  const [savedStaff, setSavedStaff] = useState<StaffRecord[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    function loadRecords() {
      getTenantRetainedRecords("progress-note").then(setSavedNotes).catch(() => setSavedNotes([]));
      getTenantStaffInvites().then(setSavedStaff).catch(() => setSavedStaff([]));
    }

    loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  useEffect(() => {
    function syncMode() {
      setDemoMode(isDemoModeEnabled());
    }

    syncMode();
    window.addEventListener("empowernotes:data-mode-updated", syncMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncMode);
  }, []);

  const savedRiskQueue = useMemo(() => {
    return savedNotes.map((record) => {
      const signals = getNoteReviewSignals(record.body);
      return {
        id: record.id,
        title: `${extractField(record.body, "Client") || record.title} - ${extractField(record.body, "Support type") || "Progress note"}`,
        status: signals.missingDetails.length || signals.riskyWordingFlags.length ? "Needs Review" : "Submitted",
        score: Math.max(45, 92 - signals.missingDetails.length * 8 - signals.riskyWordingFlags.length * 10),
        billingEvidenceScore: Math.max(40, 88 - signals.missingDetails.length * 7),
        missingDetails: signals.missingDetails,
        riskyWordingFlags: signals.riskyWordingFlags
      };
    });
  }, [savedNotes]);
  const sampleRiskQueue = demoMode ? progressNotes.map((note) => {
    const participant = participants.find((item) => item.id === note.participantId);
    return {
      id: note.id,
      title: `${participant?.name ?? "Client"} - ${note.supportType}`,
      status: note.status,
      score: note.score,
      billingEvidenceScore: note.billingEvidenceScore,
      missingDetails: note.missingDetails,
      riskyWordingFlags: note.riskyWordingFlags
    };
  }) : [];
  const riskQueue = savedRiskQueue.length ? savedRiskQueue : sampleRiskQueue;
  const staffRows = savedStaff.length ? savedStaff : demoMode ? users : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Documentation Risk Queue</h2>
          <StatusBadge label="Manager view" tone="blue" />
        </div>
        <div className="space-y-4">
          {!riskQueue.length ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="font-semibold text-ink">No documentation risk items yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Saved progress notes will appear here with review signals as workers test the app.</p>
            </div>
          ) : null}
          {riskQueue.map((note) => {
            return (
              <div key={note.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{note.title}</h3>
                  <StatusBadge label={note.status} tone={note.status === "Approved" ? "green" : "amber"} />
                </div>
                <p className="mt-2 text-sm text-slate-600">Audit score {note.score}% - Billing evidence {note.billingEvidenceScore}%</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {note.missingDetails.map((item) => <StatusBadge key={item} label={item} tone="amber" />)}
                  {note.riskyWordingFlags.map((item) => <StatusBadge key={item} label={`Risky wording: ${item}`} tone="red" />)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Staff Quality Trends</h2>
        <div className="mt-4 space-y-4">
          {!staffRows.length ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Add staff to see quality trends.</div>
          ) : null}
          {staffRows.map((user) => (
            <div key={user.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{user.name}</span>
                <span className="text-slate-600">{user.qualityTrend[user.qualityTrend.length - 1] ?? 0}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-sea" style={{ width: `${user.qualityTrend[user.qualityTrend.length - 1] ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <TrendingUp size={18} aria-hidden="true" />
          Quality scores update as saved records are reviewed.
        </div>
      </Card>
      <Card className="lg:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink"><LockKeyhole size={18} aria-hidden="true" />Admin Roster Snapshot</h2>
            <p className="mt-1 text-sm text-slate-600">Locked shift visibility and status reporting for admin users.</p>
          </div>
          <Link href="/roster" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sea px-3 text-sm font-semibold text-white hover:bg-teal-800">
            <CalendarDays size={17} aria-hidden="true" />Open roster
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-4"><p className="text-sm text-slate-600">Today&apos;s rostered shifts</p><p className="mt-2 text-2xl font-bold text-ink">{rosterSummary.todayCount}</p></div>
          <div className="rounded-md bg-sky-50 p-4"><p className="text-sm text-slate-600">Shifts in progress</p><p className="mt-2 text-2xl font-bold text-sky-800">{rosterSummary.inProgress}</p></div>
          <div className="rounded-md bg-amber-50 p-4"><p className="text-sm text-slate-600">Completed needing notes</p><p className="mt-2 text-2xl font-bold text-amber-800">{rosterSummary.completedNeedingNotes}</p></div>
          <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-slate-600">Cancelled/no-show shifts</p><p className="mt-2 text-2xl font-bold text-red-700">{rosterSummary.cancelledOrNoShow}</p></div>
        </div>
      </Card>
    </div>
  );
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function getNoteReviewSignals(body: string) {
  const lower = body.toLowerCase();
  const missingDetails = [
    ["Client", extractField(body, "Client")],
    ["House/service", extractField(body, "House/service")],
    ["Support type", extractField(body, "Support type")],
    ["Date", extractField(body, "Date")],
    ["Time", extractField(body, "Time")],
    ["Goal link", lower.includes("goal") ? "present" : ""],
    ["Follow-up action", lower.includes("follow-up") ? "present" : ""]
  ].filter(([, value]) => !value || value.toLowerCase().includes("not selected")).map(([label]) => label);
  const riskyTerms = ["aggressive", "non-compliant", "refused to listen", "attention-seeking", "bad behaviour", "lazy", "naughty"];
  const riskyWordingFlags = riskyTerms.filter((term) => lower.includes(term));
  return { missingDetails, riskyWordingFlags };
}
