"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CreditCard,
  LifeBuoy,
  ListChecks,
  LockKeyhole,
  ReceiptText,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TrialRunChecklist } from "@/components/trial/TrialRunChecklist";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { analyticsSignals, diagnosticEvents, paymentSchedule, platformOrganisations, platformSummary, type PlatformOrganisationStatus } from "@/lib/platform-data";
import { clearPlatformAccessStatus, getEffectivePlatformStatus, getPlatformAccessOverride, isAccessBlocked, setDemoCurrentOrganisation, setPlatformAccessStatus } from "@/lib/platform-access";
import { cn } from "@/lib/utils";

type PlatformAreaId = "overview" | "organisations" | "subscriptions" | "payments" | "diagnostics" | "analytics" | "security" | "support" | "trial";

const consoleAreas = [
  { id: "overview", title: "Overview", detail: "Owner snapshot for growth, revenue, active users, failed payments, and platform health.", icon: BarChart3, badge: "Home" },
  { id: "organisations", title: "Organisations", detail: "Tenant status, owners, plans, users, clients, usage, and account health.", icon: Building2, badge: "Tenants" },
  { id: "subscriptions", title: "Subscriptions", detail: "Plan mix, renewals, trials, failed payments, invoices, refunds, MRR, and ARR.", icon: ReceiptText, badge: "Revenue" },
  { id: "payments", title: "Payments", detail: "Upcoming charges, retries, overdue accounts, payment method status, and schedules.", icon: CreditCard, badge: "Billing" },
  { id: "diagnostics", title: "Diagnostics", detail: "AI failures, upload issues, webhook delays, email reminder failures, and slow workflows.", icon: Activity, badge: "Health" },
  { id: "analytics", title: "Analytics", detail: "Feature adoption, activation, retention, usage trends, and cohort performance.", icon: BarChart3, badge: "Data" },
  { id: "security", title: "Security", detail: "Admin logins, role changes, exports, deletes, suspicious activity, and support access.", icon: LockKeyhole, badge: "Audit" },
  { id: "support", title: "Support", detail: "Search accounts, inspect recent issues, resend invites, and review account notes.", icon: LifeBuoy, badge: "Ops" },
  { id: "trial", title: "Trial Run", detail: "Internal checklist for product demos, QA walkthroughs, and end-to-end readiness checks.", icon: ListChecks, badge: "Internal" }
] satisfies Array<{ id: PlatformAreaId; title: string; detail: string; icon: LucideIcon; badge: string }>;

const securityEvents = [
  "Owner login successful - 9 min ago",
  "Admin password gate unlocked - 18 min ago",
  "CSV export requested by platform owner - 1 hr ago",
  "Role change audit review pending - 2 hrs ago"
];

const supportEvents = [
  "Bright Path Care: payment retry question",
  "Harbour Community Supports: resend owner invite",
  "Northside Youth Services: trial conversion check-in",
  "Mosaic Support Co: enterprise onboarding notes"
];

export function PlatformDashboard() {
  const [activeArea, setActiveArea] = useState<PlatformAreaId>("overview");
  const active = consoleAreas.find((area) => area.id === activeArea) ?? consoleAreas[0];

  useEffect(() => {
    function syncFromHash() {
      const hashArea = window.location.hash.replace("#", "") as PlatformAreaId;
      if (consoleAreas.some((area) => area.id === hashArea)) {
        setActiveArea(hashArea);
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Developer platform console"
        title="Monitor subscriptions, payments, diagnostics, and platform growth"
        description="An owner-only command centre separate from the provider-facing app. Use it to understand account health, revenue, usage, system issues, and operational risk."
        actions={<StatusBadge label="Super admin only" tone="red" />}
      />

      <Section className="space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-200">Developer admin navigation</p>
            <h2 className="mt-2 text-2xl font-bold">{active.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{active.detail}</p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {consoleAreas.map((area) => {
              const Icon = area.icon;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    setActiveArea(area.id);
                    window.history.replaceState(null, "", `#${area.id}`);
                  }}
                  className={cn(
                    "rounded-md border p-4 text-left transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700",
                    activeArea === area.id ? "border-teal-400 bg-teal-50 shadow-lift" : "border-slate-200 bg-white hover:border-teal-300"
                  )}
                  aria-pressed={activeArea === area.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-ink">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <StatusBadge label={area.badge} tone="blue" />
                  </div>
                  <h3 className="mt-4 font-semibold text-ink">{area.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{area.detail}</p>
                </button>
              );
            })}
          </div>
        </Card>

        <div id={activeArea} className="scroll-mt-28">
          <PlatformAreaContent activeArea={activeArea} />
        </div>
      </Section>
    </>
  );
}

function PlatformAreaContent({ activeArea }: { activeArea: PlatformAreaId }) {
  if (activeArea === "overview") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformMetric label="Organisations" value={platformSummary.organisations} detail={`${platformSummary.trialAccounts} trials active`} icon={Building2} />
          <PlatformMetric label="Active users" value={platformSummary.activeUsers} detail={`${platformSummary.activeClients} active clients`} icon={Users} tone="blue" />
          <PlatformMetric label="MRR" value={platformSummary.monthlyRecurringRevenue} detail={`${platformSummary.annualRecurringRevenue} ARR`} icon={ReceiptText} tone="green" />
          <PlatformMetric label="Failed payments" value={platformSummary.failedPayments} detail={`${platformSummary.aiSpendMonth} AI spend this month`} icon={AlertTriangle} tone="amber" />
        </div>
        <AccountInsightsPanel />
      </div>
    );
  }

  if (activeArea === "organisations") return <OrganisationHealthTable />;

  if (activeArea === "subscriptions") {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <OrganisationHealthTable title="Subscription accounts" badge="Plans" />
        <PlatformPanel title="Subscription signals" badge="Revenue" items={[
          `${platformSummary.monthlyRecurringRevenue} monthly recurring revenue`,
          `${platformSummary.annualRecurringRevenue} annual recurring revenue`,
          `${platformSummary.trialAccounts} trial accounts need conversion follow-up`,
          `${platformSummary.failedPayments} failed payments may affect subscription status`
        ]} />
      </div>
    );
  }

  if (activeArea === "payments") return <PaymentSchedulePanel />;
  if (activeArea === "diagnostics") return <PlatformPanel title="Diagnostics Console" badge="Live health" items={diagnosticEvents.map((item) => `${item.area}: ${item.event} (${item.time})`)} />;
  if (activeArea === "analytics") {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PlatformPanel title="Data Analytics" badge="Usage" items={analyticsSignals.map((item) => `${item.label}: ${item.value} (${item.change})`)} />
        <AccountInsightsPanel />
      </div>
    );
  }
  if (activeArea === "security") return <PlatformPanel title="Security Audit" badge="Audit" items={securityEvents} />;
  if (activeArea === "trial") return <TrialRunChecklist />;
  return <PlatformPanel title="Support Operations" badge="Ops" items={supportEvents} />;
}

function AccountInsightsPanel() {
  const largest = [...platformOrganisations].sort((a, b) => b.clients - a.clients)[0];
  const highestAi = [...platformOrganisations].sort((a, b) => b.aiCalls - a.aiCalls)[0];
  const incidentRisk = [...platformOrganisations].sort((a, b) => b.incidents - a.incidents)[0];
  const paymentRisk = platformOrganisations.filter((organisation) => getEffectivePlatformStatus(organisation.id) === "Payment risk");

  const insights = [
    `${largest.name} has the highest client volume at ${largest.clients} clients across ${largest.users} users.`,
    `${highestAi.name} is the heaviest AI user with ${highestAi.aiCalls} AI calls and ${highestAi.notesCreated} notes created.`,
    `${incidentRisk.name} has the highest incident count at ${incidentRisk.incidents}; monitor reporting quality and follow-up completion.`,
    paymentRisk.length ? `${paymentRisk.length} account needs payment follow-up before renewal or suspension.` : "No payment-risk account is currently active.",
    "Production wiring should write these metrics from Supabase usage tables and Stripe subscription/webhook events."
  ];

  return <PlatformPanel title="Account insights" badge="Live-readiness" items={insights} />;
}

function OrganisationHealthTable({ title = "Organisation health", badge = "Cross-account view" }: { title?: string; badge?: string }) {
  const [version, setVersion] = useState(0);
  const [reason, setReason] = useState("Payment overdue or trial access review required.");

  function updateAccess(organisationId: string, status: PlatformOrganisationStatus) {
    setPlatformAccessStatus(organisationId, status, reason);
    setVersion((current) => current + 1);
  }

  function reactivate(organisationId: string) {
    clearPlatformAccessStatus(organisationId);
    setVersion((current) => current + 1);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Tenant accounts</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{title}</h2>
        </div>
        <StatusBadge label={badge} tone="red" />
      </div>
      <div className="mt-4 grid gap-3 rounded-md border border-amber-100 bg-amber-50/70 p-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-semibold text-amber-950">
          Access action reason
          <input className="min-h-11 rounded-md border border-amber-200 bg-white px-3 text-sm text-ink" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <p className="text-sm leading-6 text-amber-950">Use suspend for payment failure, cancellation, breach, or manual account review. Production should enforce this server-side.</p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-3 pr-4">Organisation</th>
              <th className="py-3 pr-4">Plan</th>
              <th className="py-3 pr-4">Users</th>
              <th className="py-3 pr-4">Clients</th>
              <th className="py-3 pr-4">Renewal</th>
              <th className="py-3 pr-4">MRR</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Insights</th>
              <th className="py-3 pr-4">Access</th>
            </tr>
          </thead>
          <tbody>
            {platformOrganisations.map((organisation) => {
              const status = getEffectivePlatformStatus(organisation.id);
              const override = getPlatformAccessOverride(organisation.id);
              const notesPerUser = Math.round(organisation.notesCreated / organisation.users);
              const clientLoad = Math.round(organisation.clients / organisation.users);
              const blocked = isAccessBlocked(status);

              return (
                <tr key={`${organisation.id}-${version}`} className={cn("border-b border-slate-100 align-top", blocked && "bg-red-50/50")}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-ink">{organisation.name}</p>
                    <p className="mt-1 text-xs text-slate-500">Last active: {organisation.lastActive}</p>
                    {override ? <p className="mt-1 text-xs text-red-700">Override: {override.reason}</p> : null}
                  </td>
                  <td className="py-3 pr-4">{organisation.plan}</td>
                  <td className="py-3 pr-4">{organisation.users}</td>
                  <td className="py-3 pr-4">{organisation.clients}</td>
                  <td className="py-3 pr-4">{organisation.renewal}</td>
                  <td className="py-3 pr-4 font-semibold">{organisation.mrr}</td>
                  <td className="py-3 pr-4"><StatusBadge label={status} tone={status === "Payment risk" ? "amber" : blocked ? "red" : status === "Trial" ? "blue" : "green"} /></td>
                  <td className="py-3 pr-4 text-xs leading-5 text-slate-600">
                    <p>{notesPerUser} notes/user</p>
                    <p>{clientLoad} clients/user</p>
                    <p>{organisation.incidents} incidents</p>
                    <p>{organisation.aiCalls} AI calls</p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setDemoCurrentOrganisation(organisation.id)} className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-ink hover:border-teal-400">Demo org</button>
                      <button type="button" onClick={() => updateAccess(organisation.id, "Suspended")} className="rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Suspend</button>
                      <button type="button" onClick={() => updateAccess(organisation.id, "Payment risk")} className="rounded-md border border-amber-200 bg-white px-2.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50">Payment risk</button>
                      <button type="button" onClick={() => reactivate(organisation.id)} className="rounded-md border border-emerald-200 bg-white px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">Reactivate</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PaymentSchedulePanel() {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <CalendarClock size={20} className="text-teal-700" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-ink">Payment schedule</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {paymentSchedule.map((payment) => (
          <div key={`${payment.organisation}-${payment.due}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{payment.organisation}</p>
                <p className="mt-1 text-sm text-slate-600">{payment.due} | {payment.amount}</p>
              </div>
              <StatusBadge label={payment.status} tone={payment.status.includes("retry") ? "amber" : "blue"} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PlatformMetric({ label, value, detail, icon: Icon, tone = "slate" }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone?: "slate" | "blue" | "green" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-ink",
    blue: "bg-sky-50 text-sky-800",
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800"
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid h-11 w-11 place-items-center rounded-md", tones[tone])}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}

function PlatformPanel({ title, badge, items }: { title: string; badge: string; items: string[] }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <StatusBadge label={badge} tone="blue" />
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <p key={item} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item}</p>
        ))}
      </div>
    </Card>
  );
}
