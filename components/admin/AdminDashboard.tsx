"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  FileWarning,
  FolderLock,
  LineChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRoundPlus,
  UserPlus
} from "lucide-react";
import { ClientReportColourCards } from "@/components/admin/ClientReportColourCards";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { getRosterSummary } from "@/lib/roster";
import { participants, progressNotes, users } from "@/lib/sample-data";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";

const adminTools = [
  {
    title: "Team Management",
    detail: "Invite staff, set roles, deactivate users, and control participant access.",
    href: "/admin/team",
    icon: UserPlus,
    badge: "Access"
  },
  {
    title: "Add Staff",
    detail: "Invite a new worker, manager, or admin and assign participant access.",
    href: "/admin/staff/new",
    icon: UserPlus,
    badge: "Invite"
  },
  {
    title: "Add Client",
    detail: "Create a client profile with support needs, risk alerts, goals, staff access, and reporting colour.",
    href: "/admin/clients/new",
    icon: UserRoundPlus,
    badge: "Client"
  },
  {
    title: "Admin Roster",
    detail: "Create shifts and review locked weekly, fortnightly, and monthly roster status.",
    href: "/roster",
    icon: CalendarDays,
    badge: "Locked"
  },
  {
    title: "Status Reports",
    detail: "Documentation health, roster-to-note completion, incidents, and evidence gaps.",
    href: "/admin/reports",
    icon: ClipboardCheck,
    badge: "Reports"
  },
  {
    title: "Progress Intelligence",
    detail: "Review plan-to-progress evidence, baselines, goal movement, and outcome signals.",
    href: "/admin/progress",
    icon: LineChart,
    badge: "Outcomes"
  },
  {
    title: "Billing",
    detail: "Review plan usage, billing status, and download a PDF billing summary.",
    href: "/admin/billing",
    icon: ReceiptText,
    badge: "Billing"
  },
  {
    title: "Note Review",
    detail: "Review weak notes, missing detail, risky wording, and notes needing approval.",
    href: "/admin/reviews",
    icon: FileCheck2,
    badge: "Quality"
  },
  {
    title: "Incident Review",
    detail: "Track incidents needing escalation, follow-up, manager review, or closure.",
    href: "/incidents",
    icon: ShieldCheck,
    badge: "Risk"
  },
  {
    title: "Document Management",
    detail: "Verify support plans, risk assessments, and worker-visible document access.",
    href: "/documents",
    icon: FolderLock,
    badge: "Evidence"
  },
  {
    title: "Audit Packs",
    detail: "Prepare evidence exports by participant, date range, worker, or incident.",
    href: "/audit-packs",
    icon: FileWarning,
    badge: "Audit"
  },
  {
    title: "Organisation Settings",
    detail: "Business details, default templates, compliance wording, and service settings.",
    href: "/admin/settings",
    icon: Settings,
    badge: "Setup"
  }
];

export function AdminDashboard() {
  const [savedClients, setSavedClients] = useState<ClientRecord[]>([]);
  const [savedStaff, setSavedStaff] = useState<StaffRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const rosterSummary = getRosterSummary();
  const weakNotes = realMode ? 0 : progressNotes.filter((note) => note.score < 80 || note.missingDetails.length > 0).length;
  const clientCount = savedClients.length || (realMode ? 0 : participants.length);
  const staffCount = savedStaff.length || (realMode ? 0 : users.length);

  useEffect(() => {
    getTenantClients().then(setSavedClients).catch(() => setSavedClients([]));
    getTenantStaffInvites().then(setSavedStaff).catch(() => setSavedStaff([]));
  }, []);

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Admin control centre"
        title="Manage the people, evidence, and reporting behind EmpowerNotes"
        description="A locked admin workspace for roster planning, team access, note review, incident oversight, documents, audit packs, settings, and reporting."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />

      <Section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Active staff" value={staffCount} detail={savedStaff.length ? "Saved staff records" : realMode ? "Add staff to begin" : "Starter team records"} />
          <AdminMetric label="Active clients" value={clientCount} detail={savedClients.length ? "Saved colour-coded profiles" : realMode ? "Add clients to begin" : "Starter colour-coded profiles"} tone="blue" />
          <AdminMetric label="Rostered today" value={rosterSummary.todayCount} detail="Admin roster shifts" />
          <AdminMetric label="Notes needing review" value={weakNotes} detail="Quality or detail risk" tone="amber" />
        </div>

        <ClientReportColourCards />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <a
                key={tool.title}
                href={tool.href}
                className="group rounded-md border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-lift focus:outline focus:outline-2 focus:outline-teal-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-mint text-teal-900 transition group-hover:bg-teal-700 group-hover:text-white">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <StatusBadge label={tool.badge} tone="blue" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink">{tool.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tool.detail}</p>
                <span className="mt-4 inline-flex min-h-10 items-center rounded-md bg-slate-50 px-3 text-sm font-semibold text-teal-900 transition group-hover:bg-teal-700 group-hover:text-white">
                  Open
                </span>
              </a>
            );
          })}
        </div>

        <Card className="grid gap-5 border-teal-200 bg-teal-50 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <span className="grid h-12 w-12 place-items-center rounded-md bg-white text-teal-800 shadow-sm">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-ink">Admin access should stay separate from worker actions</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">Workers should move quickly through participant context, notes, incidents, and documents. Admins control rostering, access, reviews, reports, billing, and organisation settings.</p>
          </div>
          <Link href="/admin/reports" className="inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
            View reports
          </Link>
        </Card>
      </Section>
    </>
  );
}

function AdminMetric({ label, value, detail, tone = "slate" }: { label: string; value: number; detail: string; tone?: "slate" | "amber" | "green" | "blue" }) {
  const toneClasses = {
    slate: "text-ink",
    amber: "text-amber-800",
    green: "text-emerald-800",
    blue: "text-sky-800"
  };

  return (
    <Card>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}
