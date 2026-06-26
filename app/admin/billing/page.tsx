import { AdminGate } from "@/components/admin/AdminGate";
import { PdfDownloadButton } from "@/components/admin/PdfDownloadButton";
import { PlanManagementCard } from "@/components/billing/PlanManagementCard";
import { UsageSummary } from "@/components/billing/UsageSummary";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";

const billingLines = [
  "Current plan: Team Plan",
  "Active users: 8 of 10 included",
  "AI notes used this month: 142",
  "Document uploads: 26",
  "Guided Voice: Enabled",
  "Document Intelligence: Enabled",
  "Invoice-readiness: Enabled",
  "Payment processing: Not connected in demo mode"
];

export default function AdminBillingPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Admin billing"
        title="Billing, plan, and usage"
        description="Admin-only view of subscription plan, feature usage, and billing report exports."
        actions={<PdfDownloadButton filename="empower-notes-billing-summary.pdf" title="Empower Notes Billing Summary" lines={billingLines} variant="primary" />}
      />
      <Section className="grid gap-6 lg:grid-cols-2">
        <UsageSummary />
        <PlanManagementCard />
      </Section>
      <Section>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Billing export</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Download a PDF copy of the current billing and usage summary for admin records.</p>
            </div>
            <StatusBadge label="Demo billing" tone="blue" />
          </div>
        </Card>
      </Section>
    </AdminGate>
  );
}
