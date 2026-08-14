"use client";

import { useCallback, useEffect, useState } from "react";
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
import { SystemHealthPanel } from "@/components/platform/SystemHealthPanel";
import { NdisPricingMonitorPanel } from "@/components/platform/NdisPricingMonitorPanel";
import { MarketingAttributionPanel } from "@/components/platform/MarketingAttributionPanel";
import { NdisMatchQualityPanel, PlatformVisualIntelligence } from "@/components/platform/PlatformVisualIntelligence";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { analyticsSignals, diagnosticEvents, paymentSchedule, platformOrganisations, platformSummary, type PlatformOrganisationStatus } from "@/lib/platform-data";
import { clearPlatformAccessStatus, getEffectivePlatformStatus, getPlatformAccessOverride, isAccessBlocked, setDemoCurrentOrganisation, setPlatformAccessStatus } from "@/lib/platform-access";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { cn } from "@/lib/utils";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

type PlatformAreaId = "overview" | "organisations" | "subscriptions" | "payments" | "ndis" | "diagnostics" | "analytics" | "marketing" | "security" | "support" | "trial";

const consoleAreas = [
  { id: "overview", title: "Overview", detail: "Owner snapshot for growth, revenue, active users, failed payments, and platform health.", icon: BarChart3, badge: "Home" },
  { id: "organisations", title: "Organisations", detail: "Tenant status, owners, plans, users, clients, usage, and account health.", icon: Building2, badge: "Tenants" },
  { id: "subscriptions", title: "Subscriptions", detail: "Plan mix, renewals, trials, failed payments, invoices, refunds, MRR, and ARR.", icon: ReceiptText, badge: "Revenue" },
  { id: "payments", title: "Payments", detail: "Upcoming charges, retries, overdue accounts, payment method status, and schedules.", icon: CreditCard, badge: "Billing" },
  { id: "ndis", title: "NDIS Pricing", detail: "Official catalogue monitoring, imports, change review, publication, and current service fees.", icon: ReceiptText, badge: "Pricing" },
  { id: "diagnostics", title: "Diagnostics", detail: "AI failures, upload issues, webhook delays, email reminder failures, and slow workflows.", icon: Activity, badge: "Health" },
  { id: "analytics", title: "Analytics", detail: "Feature adoption, activation, retention, usage trends, and cohort performance.", icon: BarChart3, badge: "Data" },
  { id: "marketing", title: "Marketing", detail: "First-party acquisition, pricing interest, sign-ups, and paid conversion attribution.", icon: BarChart3, badge: "Growth" },
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

  const [dataModeChecked, setDataModeChecked] = useState(false);
  const [showDemoData, setShowDemoData] = useState(false);
  const active = consoleAreas.find((area) => area.id === activeArea) ?? consoleAreas[0];

  useEffect(() => {
    setShowDemoData(isPresentationModeEnabled());
    setDataModeChecked(true);
  }, []);

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

  if (!dataModeChecked) return <div className="min-h-[55vh] bg-slate-100" aria-label="Loading platform data mode" />;
  if (!showDemoData) return <LivePlatformDataPending />;

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

type LivePlatformSummary = {
  generatedAt: string;
  summary: { organisations: number; activeUsers: number; activeClients: number; incidents: number; trialAccounts: number; payingAccounts: number; paymentRisk: number; lifetimeRevenueCents: number; currentMonthRevenueCents: number };
  organisations: Array<{
    id: string;
    name: string;
    signedUpAt: string;
    providerType: string;
    tier: string;
    status: string;
    billingState: string;
    trialEndsAt: string;
    currentPeriodEnd: string;
    hasStripeCustomer: boolean;
    hasStripeSubscription: boolean;
    platformAccessStatus: string;
    platformAccessReason: string;
    platformAccessUpdatedAt: string;
    users: number;
    clients: number;
    incidents: number;
  }>;
  payments: {
    lifetimePaidCents: number;
    currentMonthPaidCents: number;
    providers: Array<{ organisationId: string; organisationName: string; lifetimePaidCents: number; missedPayments: number; outstandingCents: number; oldestUnpaidAt: string; overdueDays: number; risk: boolean; lastPaidAt: string }>;
    monthly: Array<{ month: string; totalPaidCents: number; providers: Array<{ organisationId: string; organisationName: string; paidCents: number }> }>;
    ledger: Array<{ invoiceId: string; organisationId: string; organisationName: string; status: string; amountDueCents: number; amountPaidCents: number; attemptCount: number; date: string; hostedInvoiceUrl: string }>;
  };
};

type LivePlatformOperations = {
  generatedAt: string;
  securityEvents: Array<{ id: string; organisation_id: string; event_type: string; severity: string; summary: string; endpoint: string; occurred_at: string }>;
  supportCases: Array<{ id: string; organisation_id: string; title: string; category: string; severity: string; status: string; page_path: string; browser: string; deployment_id: string; created_at: string; updated_at: string; resolved_at: string }>;
  usage: Array<{ organisation_id: string; usage_period_start: string; usage_period_end: string; active_participants: number; active_users: number; active_houses: number; documents_uploaded: number; ai_analysed_notes: number; invoice_lines: number; storage_bytes: number }>;
  observations: Array<{ organisation_id: string; resource: string; action_name: string; would_block: boolean; observed_at: string }>;
  auditEvents: Array<{ organisation_id: string; actor_id: string; action: string; entity_type: string; created_at: string }>;
  snapshots: Array<{ snapshot_date: string; organisation_id: string; subscription_tier: string; subscription_status: string; platform_access_status: string; users_count: number; clients_count: number; houses_count: number; incidents_count: number; ai_notes_count: number; documents_count: number; invoice_lines_count: number; storage_bytes: number; collected_revenue_cents: number; outstanding_revenue_cents: number; captured_at: string }>;
  ndisMatchEvents: Array<{ organisation_id: string; outcome: "success" | "failure"; match_source: "ai" | "rules" | "none"; failure_category: string | null; selected_support_item_number: string | null; selected_price: number | null; confidence: number | null; candidate_count: number; occurred_at: string }>;
  availability: Record<string, boolean>;
};

function LivePlatformDataPending() {
  const [data, setData] = useState<LivePlatformSummary | null>(null);
  const [operations, setOperations] = useState<LivePlatformOperations | null>(null);
  const [error, setError] = useState("");
  const [activeArea, setActiveArea] = useState<PlatformAreaId>("overview");

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) { setData(null); setOperations(null); }
    setError("");
    try {
      const [summaryResponse, operationsResponse] = await Promise.all([
        fetch("/api/platform/summary", { headers: getAuthenticatedApiHeaders(), cache: "no-store" }),
        fetch("/api/platform/operations", { headers: getAuthenticatedApiHeaders(), cache: "no-store" })
      ]);
      const summary = await summaryResponse.json() as LivePlatformSummary & { error?: string };
      const operational = await operationsResponse.json() as LivePlatformOperations & { error?: string };
      if (!summaryResponse.ok) throw new Error(summary.error || "Live platform data could not be loaded.");
      if (!operationsResponse.ok) throw new Error(operational.error || "Platform operations could not be loaded. Run the platform operations migration.");
      setData(summary);
      setOperations(operational);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Live platform data could not be loaded.");
    }
  }, []);

  useEffect(() => {
    function syncArea() {
      const area = window.location.hash.slice(1) as PlatformAreaId;
      if (consoleAreas.some((item) => item.id === area)) setActiveArea(area);
    }
    syncArea();
    window.addEventListener("hashchange", syncArea);
    return () => window.removeEventListener("hashchange", syncArea);
  }, []);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 120000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  function refresh() {
    void loadData(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Developer platform console"
        title="Live platform operations"
        description="Private cross-tenant operational counts from the production workspace. Stripe revenue analytics remain separate from clinical and operational data."
        actions={<StatusBadge label="Owner only" tone="red" />}
      />
      <Section className="space-y-6">
        {error ? <Card className="border-red-200"><p className="font-semibold text-red-800">{error}</p></Card> : null}
        {(!data || !operations) && !error ? <Card><p className="font-semibold text-ink">Loading live platform data...</p></Card> : null}
        {data && operations ? <>
          <Card className="p-3">
            <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Platform console areas">
              {consoleAreas.map((area) => <button key={area.id} type="button" role="tab" aria-selected={activeArea === area.id} onClick={() => { setActiveArea(area.id); window.history.replaceState(null, "", `#${area.id}`); }} className={cn("min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold", activeArea === area.id ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-teal-50")}>{area.title}</button>)}
              <button type="button" onClick={refresh} className="ml-auto min-h-10 shrink-0 rounded-md border border-slate-300 px-3 text-sm font-semibold text-ink">Refresh</button>
            </div>
          </Card>
          <LivePlatformArea activeArea={activeArea} data={data} operations={operations} onRefresh={refresh} />
        </> : null}
      </Section>
    </>
  );
}

function LivePlatformArea({ activeArea, data, operations, onRefresh }: { activeArea: PlatformAreaId; data: LivePlatformSummary; operations: LivePlatformOperations; onRefresh: () => void }) {
  if (activeArea === "overview") return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><PlatformMetric label="Organisations" value={data.summary.organisations} detail={`${data.summary.trialAccounts} trials active`} icon={Building2} /><PlatformMetric label="Paying" value={data.summary.payingAccounts} detail="Active subscriptions" icon={CreditCard} tone="green" /><PlatformMetric label="Users" value={data.summary.activeUsers} detail={`${data.summary.activeClients} clients`} icon={Users} tone="blue" /><PlatformMetric label="Payment attention" value={data.summary.paymentRisk} detail="Past-due providers" icon={AlertTriangle} tone="amber" /></div><PlatformVisualIntelligence organisations={data.organisations} payments={data.payments} snapshots={operations.snapshots || []} usage={operations.usage} securityEvents={operations.securityEvents} supportCases={operations.supportCases} ndisMatchEvents={operations.ndisMatchEvents || []} /><SystemHealthPanel /><NdisPricingMonitorPanel /><MarketingAttributionPanel /><LiveUsagePanel data={data} operations={operations} /><SubscriptionPaymentLedger payments={data.payments} /><LiveOrganisationTable data={data} operations={operations} onRefresh={onRefresh} compact /></div>;
  if (activeArea === "organisations") return <LiveOrganisationTable data={data} operations={operations} onRefresh={onRefresh} />;
  if (activeArea === "subscriptions") return <div className="space-y-6"><LiveSubscriptionSummary data={data} /><LiveOrganisationTable data={data} operations={operations} onRefresh={onRefresh} compact /></div>;
  if (activeArea === "payments") return <SubscriptionPaymentLedger payments={data.payments} />;
  if (activeArea === "ndis") return <div className="space-y-6"><NdisPricingMonitorPanel /><NdisMatchQualityPanel events={operations.ndisMatchEvents || []} /></div>;
  if (activeArea === "diagnostics") return <SystemHealthPanel />;
  if (activeArea === "analytics") return <div className="space-y-6"><PlatformVisualIntelligence organisations={data.organisations} payments={data.payments} snapshots={operations.snapshots || []} usage={operations.usage} securityEvents={operations.securityEvents} supportCases={operations.supportCases} ndisMatchEvents={operations.ndisMatchEvents || []} /><LiveUsagePanel data={data} operations={operations} /></div>;
  if (activeArea === "marketing") return <MarketingAttributionPanel />;
  if (activeArea === "security") return <LiveSecurityPanel data={data} operations={operations} />;
  if (activeArea === "support") return <LiveSupportPanel data={data} operations={operations} onRefresh={onRefresh} />;
  return <TrialRunChecklist />;
}

function LiveSubscriptionSummary({ data }: { data: LivePlatformSummary }) {
  const tiers = ["solo", "practice", "provider", "enterprise"].map((tier) => ({ tier, count: data.organisations.filter((item) => item.tier === tier).length }));
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tiers.map((item) => <PlatformMetric key={item.tier} label={item.tier[0].toUpperCase() + item.tier.slice(1)} value={item.count} detail="Organisations" icon={ReceiptText} tone={item.tier === "enterprise" ? "green" : "blue"} />)}</div>;
}

function LiveUsagePanel({ data, operations }: { data: LivePlatformSummary; operations: LivePlatformOperations }) {
  const latest = new Map<string, LivePlatformOperations["usage"][number]>();
  operations.usage.forEach((row) => { if (!latest.has(row.organisation_id)) latest.set(row.organisation_id, row); });
  const aiCalls = [...latest.values()].reduce((sum, row) => sum + Number(row.ai_analysed_notes || 0), 0);
  const documents = [...latest.values()].reduce((sum, row) => sum + Number(row.documents_uploaded || 0), 0);
  const invoiceLines = [...latest.values()].reduce((sum, row) => sum + Number(row.invoice_lines || 0), 0);
  return <Card><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Product usage</p><h2 className="mt-1 text-xl font-semibold text-ink">Latest recorded period</h2></div><StatusBadge label={operations.availability.usage ? "Live" : "Unavailable"} tone={operations.availability.usage ? "green" : "amber"} /></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PlatformMetric label="AI-assisted notes" value={aiCalls} detail="No note content exposed" icon={Activity} tone="blue" /><PlatformMetric label="Documents" value={documents} detail="Upload count only" icon={ReceiptText} /><PlatformMetric label="Invoice lines" value={invoiceLines} detail="Usage count" icon={CreditCard} tone="green" /><PlatformMetric label="Limit warnings" value={operations.observations.filter((row) => row.would_block).length} detail="Entitlement observations" icon={AlertTriangle} tone="amber" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">Organisation</th><th className="py-3 pr-4">AI notes</th><th className="py-3 pr-4">Documents</th><th className="py-3 pr-4">Invoices</th><th className="py-3">Storage</th></tr></thead><tbody>{data.organisations.map((org) => { const row = latest.get(org.id); return <tr key={org.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-semibold text-ink">{org.name}</td><td className="py-3 pr-4">{row?.ai_analysed_notes || 0}</td><td className="py-3 pr-4">{row?.documents_uploaded || 0}</td><td className="py-3 pr-4">{row?.invoice_lines || 0}</td><td className="py-3">{formatBytes(row?.storage_bytes || 0)}</td></tr>; })}</tbody></table></div></Card>;
}

function LiveOrganisationTable({ data, operations, onRefresh, compact = false }: { data: LivePlatformSummary; operations: LivePlatformOperations; onRefresh: () => void; compact?: boolean }) {
  const [reason, setReason] = useState("Account review requested by platform owner.");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const latest = new Map<string, LivePlatformOperations["usage"][number]>(); operations.usage.forEach((row) => { if (!latest.has(row.organisation_id)) latest.set(row.organisation_id, row); });
  async function setAccess(organisationId: string, status: string) { setBusy(organisationId + status); setMessage(""); const response = await fetch("/api/platform/operations", { method: "POST", headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_access", organisationId, status, reason }) }); const body = await response.json() as { error?: string }; setBusy(""); if (!response.ok) return setMessage(body.error || "Access update failed."); setMessage("Organisation access updated and audited."); onRefresh(); }
  return <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Tenant accounts</p><h2 className="mt-1 text-xl font-semibold text-ink">Organisation control</h2></div><StatusBadge label="Production" tone="green" /></div>{!compact ? <label className="mt-4 grid max-w-2xl gap-2 text-sm font-semibold text-slate-700">Reason for access change<input value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3 font-normal text-ink" /></label> : null}{message ? <p className="mt-3 text-sm font-semibold text-slate-700" role="status">{message}</p> : null}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">Organisation</th><th className="py-3 pr-4">Plan</th><th className="py-3 pr-4">Subscription</th><th className="py-3 pr-4">Users</th><th className="py-3 pr-4">Clients</th><th className="py-3 pr-4">Houses</th><th className="py-3 pr-4">Platform access</th>{!compact ? <th className="py-3">Actions</th> : null}</tr></thead><tbody>{data.organisations.map((org) => { const usage = latest.get(org.id); const blocked = ["suspended", "locked_review", "cancelled"].includes(org.platformAccessStatus); return <tr key={org.id} className={cn("border-b border-slate-100 align-top", blocked && "bg-red-50/60")}><td className="py-3 pr-4"><p className="font-semibold text-ink">{org.name}</p><p className="text-xs text-slate-500">{formatPlatformDate(org.signedUpAt)}</p></td><td className="py-3 pr-4 capitalize">{org.tier}</td><td className="py-3 pr-4"><StatusBadge label={org.billingState} tone={org.billingState === "Paying" ? "green" : org.billingState === "Payment issue" ? "amber" : "blue"} /></td><td className="py-3 pr-4">{org.users}</td><td className="py-3 pr-4">{org.clients}</td><td className="py-3 pr-4">{usage?.active_houses || 0}</td><td className="py-3 pr-4"><StatusBadge label={org.platformAccessStatus.replaceAll("_", " ")} tone={blocked ? "red" : org.platformAccessStatus === "payment_risk" ? "amber" : "green"} />{org.platformAccessReason ? <p className="mt-1 max-w-xs text-xs text-slate-600">{org.platformAccessReason}</p> : null}</td>{!compact ? <td className="py-3"><div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={() => void setAccess(org.id, "suspended")} className="rounded-md border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Suspend</button><button disabled={Boolean(busy)} onClick={() => void setAccess(org.id, "payment_risk")} className="rounded-md border border-amber-200 px-2.5 py-2 text-xs font-semibold text-amber-800 disabled:opacity-50">Flag risk</button><button disabled={Boolean(busy)} onClick={() => void setAccess(org.id, "active")} className="rounded-md border border-emerald-200 px-2.5 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50">Restore</button></div></td> : null}</tr>; })}</tbody></table></div></Card>;
}

function LiveSecurityPanel({ data, operations }: { data: LivePlatformSummary; operations: LivePlatformOperations }) {
  const names = new Map(data.organisations.map((item) => [item.id, item.name]));
  const events = [...operations.securityEvents, ...operations.auditEvents.map((event) => ({ id: `${event.organisation_id}-${event.created_at}-${event.action}`, organisation_id: event.organisation_id, event_type: event.action, severity: "info", summary: `${event.action.replaceAll("_", " ")} · ${event.entity_type}`, endpoint: "", occurred_at: event.created_at }))].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 100);
  return <Card><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Security</p><h2 className="mt-1 text-xl font-semibold text-ink">Access and audit events</h2></div><StatusBadge label="Metadata only" tone="green" /></div><div className="mt-5 space-y-3">{events.map((event) => <div key={event.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 p-4"><div><p className="font-semibold capitalize text-ink">{event.event_type.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-slate-700">{event.summary}</p><p className="mt-2 text-xs text-slate-500">{names.get(event.organisation_id) || "Platform"} · {new Date(event.occurred_at).toLocaleString("en-AU")}</p></div><StatusBadge label={event.severity} tone={event.severity === "critical" ? "red" : event.severity === "warning" ? "amber" : "blue"} /></div>)}{!events.length ? <p className="rounded-md bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No security events recorded.</p> : null}</div></Card>;
}

function LiveSupportPanel({ data, operations, onRefresh }: { data: LivePlatformSummary; operations: LivePlatformOperations; onRefresh: () => void }) {
  const names = new Map(data.organisations.map((item) => [item.id, item.name])); const [busy, setBusy] = useState("");
  async function update(id: string, status: string) { setBusy(id); await fetch("/api/platform/operations", { method: "POST", headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_support", supportCaseId: id, supportStatus: status }) }); setBusy(""); onRefresh(); }
  return <Card><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Support</p><h2 className="mt-1 text-xl font-semibold text-ink">Reported issues</h2></div><StatusBadge label={`${operations.supportCases.filter((item) => !["resolved", "closed"].includes(item.status)).length} open`} tone="amber" /></div><div className="mt-5 space-y-3">{operations.supportCases.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink">{item.title}</p><p className="mt-1 text-sm text-slate-600">{names.get(item.organisation_id) || "Unassigned organisation"} · {item.category.replaceAll("_", " ")}</p><p className="mt-2 text-xs text-slate-500">{item.page_path || "Page not supplied"} · {new Date(item.created_at).toLocaleString("en-AU")}</p></div><StatusBadge label={item.status} tone={["resolved", "closed"].includes(item.status) ? "green" : item.severity === "critical" ? "red" : "amber"} /></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy === item.id} onClick={() => void update(item.id, "investigating")} className="rounded-md border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-800">Investigate</button><button disabled={busy === item.id} onClick={() => void update(item.id, "resolved")} className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">Resolve</button></div></div>)}{!operations.supportCases.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">No support cases have been submitted.</p> : null}</div></Card>;
}

function formatBytes(bytes: number) { if (!bytes) return "0 MB"; const units = ["B", "KB", "MB", "GB", "TB"]; const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024))); return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`; }

function SubscriptionPaymentLedger({ payments }: { payments: LivePlatformSummary["payments"] }) {
  const maxMonthly = Math.max(1, ...payments.monthly.map((item) => item.totalPaidCents));
  const providerColours = ["bg-teal-600", "bg-sky-500", "bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];
  const providerIds = Array.from(new Set(payments.monthly.flatMap((month) => month.providers.map((provider) => provider.organisationId))));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PlatformMetric label="Lifetime subscription payments" value={formatAud(payments.lifetimePaidCents)} detail="Successful Stripe invoices recorded" icon={ReceiptText} tone="green" />
        <PlatformMetric label="Paid this month" value={formatAud(payments.currentMonthPaidCents)} detail="Current calendar month" icon={BarChart3} tone="blue" />
        <PlatformMetric label="Missed payments" value={payments.providers.reduce((total, item) => total + item.missedPayments, 0)} detail="Unresolved provider invoices" icon={CreditCard} tone="amber" />
        <PlatformMetric label="Two-month risk" value={payments.providers.filter((item) => item.risk).length} detail="Overdue for 60 days or more" icon={AlertTriangle} tone="amber" />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Revenue intelligence</p><h2 className="mt-1 text-xl font-semibold text-ink">Monthly provider payment comparison</h2><p className="mt-1 text-sm text-slate-600">Successful EmpowerNotes subscription payments only.</p></div>
          <StatusBadge label="Stripe ledger" tone="green" />
        </div>
        <div className="mt-5 space-y-4">
          {payments.monthly.map((month) => (
            <div key={month.month} className="grid gap-2 sm:grid-cols-[6rem_1fr_7rem] sm:items-center">
              <p className="text-sm font-semibold text-slate-700">{formatMonth(month.month)}</p>
              <div className="flex h-8 overflow-hidden rounded-md bg-slate-100" style={{ width: `${Math.max(4, month.totalPaidCents / maxMonthly * 100)}%` }}>
                {month.providers.map((provider) => {
                  const colour = providerColours[Math.max(0, providerIds.indexOf(provider.organisationId)) % providerColours.length];
                  return <div key={provider.organisationId} className={cn("h-full transition-opacity hover:opacity-80", colour)} style={{ width: `${provider.paidCents / Math.max(1, month.totalPaidCents) * 100}%` }} title={`${provider.organisationName}: ${formatAud(provider.paidCents)}`} />;
                })}
              </div>
              <p className="text-right text-sm font-bold text-ink">{formatAud(month.totalPaidCents)}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {providerIds.map((providerId, index) => {
            const provider = payments.providers.find((item) => item.organisationId === providerId);
            return <span key={providerId} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><span className={cn("h-3 w-3 rounded-sm", providerColours[index % providerColours.length])} />{provider?.organisationName || "Provider"}</span>;
          })}
        </div>
      </Card>

      <Card>
        <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Provider account risk</p><h2 className="mt-1 text-xl font-semibold text-ink">Payments by provider</h2></div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">Provider</th><th className="py-3 pr-4">Lifetime paid</th><th className="py-3 pr-4">Last payment</th><th className="py-3 pr-4">Missed</th><th className="py-3 pr-4">Outstanding</th><th className="py-3">Risk</th></tr></thead>
            <tbody>{payments.providers.map((provider) => <tr key={provider.organisationId} className={cn("border-b border-slate-100", provider.risk && "bg-red-50/60")}><td className="py-3 pr-4 font-semibold text-ink">{provider.organisationName}</td><td className="py-3 pr-4 font-semibold">{formatAud(provider.lifetimePaidCents)}</td><td className="py-3 pr-4">{formatPlatformDate(provider.lastPaidAt)}</td><td className="py-3 pr-4">{provider.missedPayments}</td><td className="py-3 pr-4">{formatAud(provider.outstandingCents)}</td><td className="py-3"><StatusBadge label={provider.risk ? `${provider.overdueDays} days overdue` : provider.missedPayments ? "Payment attention" : "Current"} tone={provider.risk ? "red" : provider.missedPayments ? "amber" : "green"} /></td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Subscription payment ledger</p><h2 className="mt-1 text-xl font-semibold text-ink">Recent Stripe invoices</h2></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Provider</th><th className="py-3 pr-4">Invoice</th><th className="py-3 pr-4">Due</th><th className="py-3 pr-4">Paid</th><th className="py-3">Status</th></tr></thead><tbody>{payments.ledger.map((entry) => <tr key={entry.invoiceId} className="border-b border-slate-100"><td className="py-3 pr-4">{formatPlatformDate(entry.date)}</td><td className="py-3 pr-4 font-semibold text-ink">{entry.organisationName}</td><td className="py-3 pr-4">{entry.hostedInvoiceUrl ? <a href={entry.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 hover:underline">{entry.invoiceId}</a> : entry.invoiceId}</td><td className="py-3 pr-4">{formatAud(entry.amountDueCents)}</td><td className="py-3 pr-4">{formatAud(entry.amountPaidCents)}</td><td className="py-3"><StatusBadge label={entry.status} tone={entry.status === "paid" ? "green" : entry.status === "failed" || entry.status === "uncollectible" ? "red" : "amber"} /></td></tr>)}</tbody></table></div>
        {!payments.ledger.length ? <p className="py-6 text-center text-sm text-slate-600">No Stripe payment events have been recorded yet.</p> : null}
      </Card>
    </div>
  );
}

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format((Number(cents) || 0) / 100);
}

function formatMonth(value: string) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

function formatPlatformDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-AU");
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
  if (activeArea === "ndis") return <NdisPricingMonitorPanel />;
  if (activeArea === "diagnostics") return <PlatformPanel title="Diagnostics Console" badge="Live health" items={diagnosticEvents.map((item) => `${item.area}: ${item.event} (${item.time})`)} />;
  if (activeArea === "analytics") {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PlatformPanel title="Data Analytics" badge="Usage" items={analyticsSignals.map((item) => `${item.label}: ${item.value} (${item.change})`)} />
        <AccountInsightsPanel />
      </div>
    );
  }
  if (activeArea === "marketing") return <MarketingAttributionPanel />;
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
    "Production wiring should write these metrics from workspace usage tables and Stripe subscription/webhook events."
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
