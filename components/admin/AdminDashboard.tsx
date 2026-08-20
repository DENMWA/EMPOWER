"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ReceiptText,
  UserPlus,
  Users
} from "lucide-react";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getNativeBillingRecords, type NativeBillingRecords } from "@/lib/native-billing";
import { getRosterShiftConflicts, getRosterSummary, type RosterShift } from "@/lib/roster";
import { loadTenantRosterShifts } from "@/lib/roster-cloud";
import { getTenantRetainedRecords } from "@/lib/retained-records";
import { getSavedIncidentReports } from "@/lib/incident-records";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import { cn } from "@/lib/utils";

const emptyBilling: NativeBillingRecords = {
  shifts: [], pricingVersions: [], supportItems: [], agreements: [], agreementItems: [], invoices: [], invoiceLines: []
};

const workspaces = [
  {
    title: "People",
    detail: "Clients, staff, houses and access.",
    href: "/admin/clients",
    icon: Users,
    links: [["Add client", "/admin/clients/new"], ["Manage staff", "/admin/team"]]
  },
  {
    title: "Scheduling",
    detail: "Coverage, shifts and conflicts.",
    href: "/admin/scheduling",
    icon: CalendarDays,
    links: [["Open calendar", "/admin/scheduling"]]
  },
  {
    title: "Records",
    detail: "Notes, incidents and documents.",
    href: "/admin/reviews",
    icon: ClipboardList,
    links: [["Review incidents", "/admin/incidents"], ["Documents", "/documents"]]
  },
  {
    title: "Invoicing",
    detail: "Agreements, services and invoices.",
    href: "/admin/billing",
    icon: ReceiptText,
    links: [["Open invoicing", "/admin/billing"]]
  },
  {
    title: "Reports",
    detail: "Progress, operations and audit exports.",
    href: "/admin/reports",
    icon: BarChart3,
    links: [["Progress", "/admin/progress"], ["Audit packs", "/admin/audit-packs"]]
  }
];

export function AdminDashboard() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [billing, setBilling] = useState<NativeBillingRecords>(emptyBilling);
  const [notesNeedingReview, setNotesNeedingReview] = useState(0);
  const [incidentsAwaitingAction, setIncidentsAwaitingAction] = useState(0);

  useEffect(() => {
    Promise.all([getTenantClients(), getTenantStaffInvites()]).then(([clientRecords, staffRecords]) => {
      setClients(clientRecords);
      setStaff(staffRecords);
    }).catch(() => undefined);
    loadTenantRosterShifts().then((result) => setShifts(result.shifts)).catch(() => setShifts([]));
    setBilling(getNativeBillingRecords());
    getTenantRetainedRecords("progress-note").then((records) => {
      setNotesNeedingReview(records.filter((record) => {
        try {
          const note = JSON.parse(record.body) as { status?: string; score?: number; missingDetails?: unknown[] };
          return note.status === "Needs Review" || (typeof note.score === "number" && note.score < 80) || Boolean(note.missingDetails?.length);
        } catch {
          return false;
        }
      }).length);
    }).catch(() => setNotesNeedingReview(0));
    getSavedIncidentReports()
      .then((records) => setIncidentsAwaitingAction(records.filter(({ report }) => report.status === "Submitted" || report.status === "Needs Review").length))
      .catch(() => setIncidentsAwaitingAction(0));
  }, []);

  const rosterSummary = getRosterSummary(shifts);
  const conflicts = shifts.flatMap((shift, index) => getRosterShiftConflicts(shift, shifts.slice(0, index)));
  const servicesReady = billing.shifts.filter((service) =>
    service.status === "completed" && !billing.invoiceLines.some((line) => line.shiftId === service.id && line.approvalStatus !== "needs_correction")
  ).length;
  const invoicesNeedingReview = billing.invoices.filter((invoice) => invoice.status === "review_required" || invoice.paymentStatus === "overdue").length;

  const attentionItems = [
    { label: "Staff roster conflicts", count: conflicts.length, href: "/admin/scheduling", action: "Resolve conflicts", urgent: true },
    { label: "Completed shifts missing notes", count: rosterSummary.completedNeedingNotes, href: "/admin/scheduling", action: "Review shifts", urgent: true },
    { label: "Notes needing review", count: notesNeedingReview, href: "/admin/reviews", action: "Review notes" },
    { label: "Incident escalations", count: incidentsAwaitingAction, href: "/admin/incidents", action: "Action incidents", urgent: true },
    { label: "Rendered services ready", count: servicesReady, href: "/admin/billing", action: "Prepare invoices" },
    { label: "Invoices needing attention", count: invoicesNeedingReview, href: "/admin/billing", action: "Review invoices", urgent: true }
  ].filter((item) => item.count > 0);

  return (
    <>
      <PageHeader
        eyebrow="Admin today"
        title="What needs your attention"
        description="Priority work, in order."
        actions={<StatusBadge label={attentionItems.length ? `${attentionItems.length} action areas` : "All clear"} tone={attentionItems.length ? "amber" : "green"} />}
      />

      <Section className="space-y-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Clients" value={clients.length} href="/admin/clients" />
          <SummaryMetric label="Staff" value={staff.length} href="/admin/team" />
          <SummaryMetric label="Rostered today" value={rosterSummary.todayCount} href="/admin/scheduling" />
          <SummaryMetric label="Ready to invoice" value={servicesReady} href="/admin/billing" tone="green" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Needs attention</h2>
              </div>
              {attentionItems.length ? <AlertTriangle size={20} className="text-amber-700" aria-hidden="true" /> : <CheckCircle2 size={20} className="text-emerald-700" aria-hidden="true" />}
            </div>
            {attentionItems.length ? (
              <div className="divide-y divide-slate-100">
                {attentionItems.map((item) => (
                  <Link key={item.label} href={item.href} className="group flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn("grid h-8 min-w-8 place-items-center rounded-md text-sm font-bold", item.urgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>{item.count}</span>
                      <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700">{item.action}<ArrowRight size={15} aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 size={30} className="mx-auto text-emerald-600" aria-hidden="true" />
                <p className="mt-3 font-semibold text-ink">No immediate actions</p>
                <p className="mt-1 text-sm text-slate-600">The current workspace has no flagged operational items.</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <QuickAction href="/admin/scheduling" icon={CalendarDays} label="Open scheduling" />
              <QuickAction href="/admin/clients/new" icon={UserPlus} label="Add client" />
              <QuickAction href="/admin/staff/new" icon={UserPlus} label="Add staff" />
              <QuickAction href="/admin/billing" icon={ReceiptText} label="Open invoicing" />
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink">Workspaces</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {workspaces.map((workspace) => {
              const Icon = workspace.icon;
              return (
                <Card key={workspace.title} className="group flex min-h-48 flex-col p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lift">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-50 text-teal-800"><Icon size={18} aria-hidden="true" /></span>
                  <Link href={workspace.href} className="mt-4 inline-flex min-h-10 items-center justify-between gap-3 rounded-md font-semibold text-ink outline-none group-hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                    <span>{workspace.title}</span>
                    <ArrowRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" aria-hidden="true" />
                  </Link>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{workspace.detail}</p>
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4">
                    {workspace.links.map(([label, href]) => <Link key={label} href={href} className="text-xs font-semibold text-teal-700 hover:text-teal-900">{label}</Link>)}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </Section>
    </>
  );
}

function SummaryMetric({ label, value, href, tone = "slate" }: { label: string; value: number; href: string; tone?: "slate" | "green" }) {
  return (
    <Link href={href} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", tone === "green" ? "text-emerald-700" : "text-ink")}>{value}</p>
    </Link>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof CalendarDays; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold text-ink hover:border-teal-300 hover:bg-teal-50/50">
      <span className="inline-flex items-center gap-2"><Icon size={17} className="text-teal-700" aria-hidden="true" />{label}</span>
      <ArrowRight size={15} className="text-slate-400" aria-hidden="true" />
    </Link>
  );
}
