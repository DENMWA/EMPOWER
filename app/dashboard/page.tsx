import { DashboardOperationalLists, ManagerDashboardCards, WorkerDashboardCards } from "@/components/dashboard/DashboardCards";
import { ManagerApprovalPanel } from "@/components/approvals/ManagerApprovalPanel";
import { InvoiceReadinessPanel } from "@/components/invoicing/InvoiceReadinessPanel";
import { PageHeader, Section } from "@/components/ui";
import { StaffProfiles } from "@/components/staff/StaffProfiles";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Worker actions stay simple, while managers and admins see documentation risk, approval queues, audit readiness, and invoice evidence." />
      <Section className="space-y-7">
        <WorkerDashboardCards />
        <ManagerDashboardCards />
        <DashboardOperationalLists />
        <StaffProfiles />
        <div className="grid gap-6 lg:grid-cols-2"><ManagerApprovalPanel /><InvoiceReadinessPanel /></div>
      </Section>
    </>
  );
}
