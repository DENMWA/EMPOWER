import Link from "next/link";
import { Card, StatusBadge } from "@/components/ui";
import { participants, progressNotes, users } from "@/lib/sample-data";
import { AlertTriangle, CheckCircle2, ClipboardList, FileWarning, Mic, TrendingUp } from "lucide-react";

const managerStats = [
  { label: "Notes awaiting review", value: "12", detail: "4 include voice transcripts", icon: ClipboardList },
  { label: "Weak notes needing improvement", value: "7", detail: "Average audit readiness 62%", icon: FileWarning },
  { label: "Incident reports awaiting review", value: "3", detail: "1 possible escalation flag", icon: AlertTriangle },
  { label: "Invoice-readiness summary", value: "68%", detail: "18 notes ready, 9 need evidence", icon: CheckCircle2 }
];

const workerActions = [
  { label: "Create progress note", href: "/notes/new", icon: ClipboardList },
  { label: "Record voice note", href: "/notes/new#voice", icon: Mic },
  { label: "Start guided interview", href: "/notes/new#guided", icon: Mic },
  { label: "Draft notes", href: "/dashboard", icon: FileWarning }
];

export function ManagerDashboardCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {managerStats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-ink">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-600">{stat.detail}</p>
              </div>
              <Icon className="text-sea" aria-hidden="true" />
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
          <Link key={action.label} href={action.href} className="rounded-md border border-slate-200 bg-white p-5 shadow-soft hover:border-teal-500 focus:outline focus:outline-2 focus:outline-teal-700">
            <Icon className="text-sea" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-ink">{action.label}</p>
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
              <div key={note.id} className="rounded-md border border-slate-200 p-4">
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
