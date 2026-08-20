import { AdminGate } from "@/components/admin/AdminGate";
import { OrganisationBrandingForm } from "@/components/admin/OrganisationBrandingForm";
import { PresentationModeCard } from "@/components/admin/PresentationModeCard";
import { RosteringModeSettings } from "@/components/admin/RosteringModeSettings";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
import { ProgressIntelligenceSettings } from "@/components/settings/progress/ProgressIntelligenceSettings";
import { DataLifecyclePanel } from "@/components/admin/DataLifecyclePanel";
import { Building2, FileCheck2, FileLock2, Palette, ShieldCheck, UsersRound } from "lucide-react";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";

const settings = [
  { label: "Organisation name", value: "EmpowerNotes Provider", icon: Building2, accent: "bg-mint text-teal-800" },
  { label: "Provider mode", value: "Organisation", icon: UsersRound, accent: "bg-skySoft text-sky-800" },
  { label: "Documentation style", value: "Person-centred, objective, evidence-ready", icon: Palette, accent: "bg-amber-50 text-gold" },
  { label: "Worker roster access", value: "Locked", icon: ShieldCheck, accent: "bg-mint text-teal-800" },
  { label: "Admin reports", value: "Weekly, fortnightly, monthly", icon: FileCheck2, accent: "bg-skySoft text-sky-800" },
  { label: "Document visibility", value: "Worker-visible or manager-only", icon: FileLock2, accent: "bg-amber-50 text-gold" }
];

export default function AdminSettingsPage() {
  return (
    <AdminGate permission="settings">
      <PageHeader
        eyebrow="Admin settings"
        title="Organisation settings"
        description="Manage your organisation identity, security and documentation defaults."
        actions={<StatusBadge label="Protected" tone="green" />}
      />
      <Section className="grid gap-5 md:grid-cols-2">
        <SupabaseSecurityPanel />
        <OrganisationBrandingForm />
        <PresentationModeCard />
        <RosteringModeSettings />
        <ProgressIntelligenceSettings />
        <DataLifecyclePanel />
        {settings.map((item) => (
          <Card key={item.label} className="border-slate-200/80 transition-colors hover:border-teal-200">
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${item.accent}`}>
                <item.icon size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className="mt-1 text-base font-semibold leading-6 text-ink">{item.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </Section>
    </AdminGate>
  );
}
