import { DashboardOperationalLists, ManagerDashboardCards, WorkerDashboardCards } from "@/components/dashboard/DashboardCards";
import { ManagerApprovalPanel } from "@/components/approvals/ManagerApprovalPanel";
import { PlanManagementCard } from "@/components/billing/PlanManagementCard";
import { UsageSummary } from "@/components/billing/UsageSummary";
import { InvoiceReadinessPanel } from "@/components/invoicing/InvoiceReadinessPanel";
import { PageHeader, Section } from "@/components/ui";
import { StaffProfiles } from "@/components/staff/StaffProfiles";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Worker actions stay simple, while managers and admins see documentation risk, approval queues, audit readiness, and invoice evidence." />
      <Section><WorkerDashboardCards /></Section>
      <Section><ManagerDashboardCards /></Section>
      <Section><DashboardOperationalLists /></Section>
      <Section><StaffProfiles /></Section>
      <Section className="grid gap-6 lg:grid-cols-2"><ManagerApprovalPanel /><InvoiceReadinessPanel /></Section>
      <Section className="grid gap-6 lg:grid-cols-2"><UsageSummary /><PlanManagementCard /></Section>
    </>
  );
}
