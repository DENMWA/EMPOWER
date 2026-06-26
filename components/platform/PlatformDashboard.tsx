import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CreditCard,
  Flag,
  LifeBuoy,
  LockKeyhole,
  ReceiptText,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { analyticsSignals, diagnosticEvents, featureFlags, paymentSchedule, platformOrganisations, platformSummary } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

const consoleAreas = [
  { title: "Organisations", detail: "Tenant status, owners, plans, users, clients, usage, and account health.", icon: Building2, badge: "Tenants" },
  { title: "Subscriptions", detail: "Plan mix, renewals, trials, failed payments, invoices, refunds, MRR, and ARR.", icon: ReceiptText, badge: "Revenue" },
  { title: "Payments", detail: "Upcoming charges, retries, overdue accounts, payment method status, and schedules.", icon: CreditCard, badge: "Billing" },
  { title: "Diagnostics", detail: "AI failures, upload issues, webhook delays, email reminder failures, and slow workflows.", icon: Activity, badge: "Health" },
  { title: "Analytics", detail: "Feature adoption, activation, retention, usage trends, and cohort performance.", icon: BarChart3, badge: "Data" },
  { title: "Security", detail: "Admin logins, role changes, exports, deletes, suspicious activity, and support access.", icon: LockKeyhole, badge: "Audit" },
  { title: "Support", detail: "Search accounts, inspect recent issues, resend invites, and review account notes.", icon: LifeBuoy, badge: "Ops" },
  { title: "Feature Flags", detail: "Enable beta features by organisation without exposing controls to providers.", icon: Flag, badge: "Flags" }
];

export function PlatformDashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Developer platform console"
        title="Monitor subscriptions, payments, diagnostics, and platform growth"
        description="An owner-only command centre separate from the provider-facing app. Use it to understand account health, revenue, usage, system issues, and operational risk."
        actions={<StatusBadge label="Super admin only" tone="red" />}
      />

      <Section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformMetric label="Organisations" value={platformSummary.organisations} detail={`${platformSummary.trialAccounts} trials active`} icon={Building2} />
          <PlatformMetric label="Active users" value={platformSummary.activeUsers} detail={`${platformSummary.activeClients} active clients`} icon={Users} tone="blue" />
          <PlatformMetric label="MRR" value={platformSummary.monthlyRecurringRevenue} detail={`${platformSummary.annualRecurringRevenue} ARR`} icon={ReceiptText} tone="green" />
          <PlatformMetric label="Failed payments" value={platformSummary.failedPayments} detail={`${platformSummary.aiSpendMonth} AI spend this month`} icon={AlertTriangle} tone="amber" />
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-200">Platform map</p>
            <h2 className="mt-2 text-2xl font-bold">Internal console areas</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">These are separated from provider admin so client organisations cannot access platform-wide business data.</p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            {consoleAreas.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.title} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-ink">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <StatusBadge label={area.badge} tone="blue" />
                  </div>
                  <h3 className="mt-4 font-semibold text-ink">{area.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{area.detail}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">Tenant accounts</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Organisation health</h2>
              </div>
              <StatusBadge label="Cross-account view" tone="red" />
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
                  </tr>
                </thead>
                <tbody>
                  {platformOrganisations.map((organisation) => (
                    <tr key={organisation.name} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-ink">{organisation.name}</td>
                      <td className="py-3 pr-4">{organisation.plan}</td>
                      <td className="py-3 pr-4">{organisation.users}</td>
                      <td className="py-3 pr-4">{organisation.clients}</td>
                      <td className="py-3 pr-4">{organisation.renewal}</td>
                      <td className="py-3 pr-4 font-semibold">{organisation.mrr}</td>
                      <td className="py-3 pr-4"><StatusBadge label={organisation.status} tone={organisation.status.includes("risk") ? "amber" : organisation.status === "Trial" ? "blue" : "green"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <CalendarClock size={20} className="text-teal-700" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-ink">Payment schedule</h2>
            </div>
            <div className="mt-4 space-y-3">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <PlatformPanel title="Diagnostics Console" badge="Live health" items={diagnosticEvents.map((item) => `${item.area}: ${item.event} (${item.time})`)} />
          <PlatformPanel title="Data Analytics" badge="Usage" items={analyticsSignals.map((item) => `${item.label}: ${item.value} (${item.change})`)} />
          <PlatformPanel title="Feature Flags" badge="Controls" items={featureFlags.map((item) => `${item.feature}: ${item.enabled} enabled, ${item.beta} beta`)} />
        </div>
      </Section>
    </>
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
