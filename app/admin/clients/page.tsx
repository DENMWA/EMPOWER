import Link from "next/link";
import { UserPlus } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { HouseManagementCard } from "@/components/admin/HouseManagementCard";
import { ClientProfiles } from "@/components/participants/ClientProfiles";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminClientsPage() {
  return (
    <AdminGate permission="people">
      <PageHeader
        eyebrow="Client management"
        title="Participant and client profiles"
        description="Admin-only client records for support needs, goals, staff access, risk alerts, documents, incidents, notes, and reporting colours."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label="Admin / owner only" tone="blue" />
            <Link href="/admin/clients/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
              <UserPlus size={17} aria-hidden="true" />
              Add client
            </Link>
          </div>
        )}
      />
      <Section>
        <HouseManagementCard />
      </Section>
      <Section>
        <ClientProfiles admin />
      </Section>
    </AdminGate>
  );
}
