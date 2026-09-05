import { Suspense } from "react";
import { RoleAwareDashboard } from "@/components/dashboard/RoleAwareDashboard";
import { CheckoutReturnSync } from "@/components/billing/CheckoutReturnSync";
import { PageHeader, Section } from "@/components/ui";

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={null}>
        <CheckoutReturnSync />
      </Suspense>
      <PageHeader title="Dashboard" description="Your assigned clients, support records, incidents, and documents in one focused workspace." />
      <Section className="space-y-7">
        <RoleAwareDashboard />
      </Section>
    </>
  );
}
