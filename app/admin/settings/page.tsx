import { AdminGate } from "@/components/admin/AdminGate";
import { OrganisationBrandingForm } from "@/components/admin/OrganisationBrandingForm";
import { PresentationModeCard } from "@/components/admin/PresentationModeCard";
import { ProgressIntelligenceSettings } from "@/components/settings/progress/ProgressIntelligenceSettings";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";

const settings = [
  { label: "Organisation name", value: "EmpowerNotes Provider" },
  { label: "Provider mode", value: "Organisation" },
  { label: "Default documentation style", value: "Person-centred, objective, evidence-ready" },
  { label: "Worker roster access", value: "Locked" },
  { label: "Admin reports", value: "Weekly, fortnightly, monthly" },
  { label: "Document visibility", value: "Worker-visible or manager-only" }
];

export default function AdminSettingsPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Admin settings"
        title="Organisation controls and default settings"
        description="Business details, access defaults, templates, documentation wording, and compliance preferences for testing and rollout."
        actions={<StatusBadge label="Admin settings" tone="blue" />}
      />
      <Section className="grid gap-4 md:grid-cols-2">
        <OrganisationBrandingForm />
        <PresentationModeCard />
        <ProgressIntelligenceSettings />
        {settings.map((item) => (
          <Card key={item.label}>
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-ink">{item.value}</p>
          </Card>
        ))}
      </Section>
    </AdminGate>
  );
}
