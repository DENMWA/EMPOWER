import Link from "next/link";
import { Card, StatusBadge } from "@/components/ui";
import { participants, progressNotes, users } from "@/lib/sample-data";
import { AlertTriangle, CheckCircle2, ClipboardList, FileWarning, Mic, TrendingUp } from "lucide-react";

const managerStats = [
  { label: "Notes awaiting review", value: "12", detail: "4 include voice transcripts", icon: ClipboardList, tone: "bg-sky-50 text-sky-800" },
  { label: "Weak notes needing improvement", value: "7", detail: "Average audit readiness 62%", icon: FileWarning, tone: "bg-amber-50 text-amber-800" },
  { label: "Incident reports awaiting review", value: "3", detail: "1 possible escalation flag", icon: AlertTriangle, tone: "bg-red-50 text-red-700" },
  { label: "Invoice-readiness summary", value: "68%", detail: "18 notes ready, 9 need evidence", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" }
];

const workerActions = [
  { label: "Create progress note", detail: "Structured support record", href: "/notes/new", icon: ClipboardList },
  { label: "Record voice note", detail: "Speak naturally on shift", href: "/notes/new#voice", icon: Mic },
  { label: "Start guided interview", detail: "Question-by-question capture", href: "/notes/new#guided", icon: Mic },
  { label: "Draft notes", detail: "Continue unfinished records", href: "/dashboard", icon: FileWarning }
];

export function ManagerDashboardCards() {
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
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Documentation Risk Queue</h2>
          <StatusBadge label="Manager view" tone="blue" />
        </div>
        <div className="space-y-4">
          {progressNotes.map((note) => {
            const participant = participants.find((item) => item.id === note.participantId);
            return (
              <div key={note.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{participant?.name} - {note.supportType}</h3>
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
          {users.map((user) => (
            <div key={user.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{user.name}</span>
                <span className="text-slate-600">{user.qualityTrend.at(-1)}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-sea" style={{ width: `${user.qualityTrend.at(-1)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <TrendingUp size={18} aria-hidden="true" />
          Quality scores are mocked for demo mode.
        </div>
      </Card>
    </div>
  );
}
