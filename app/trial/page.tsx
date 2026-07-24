"use client";

import { useEffect } from "react";
import { ButtonLink, Card, PageHeader, Section, StatusBadge } from "@/components/ui";

export default function TrialPage() {
  useEffect(() => {
    window.location.replace("/platform#trial");
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Platform trial run"
        title="Trial run has moved to the developer console"
        description="The internal trial checklist now sits in the developer platform console, away from subscribed worker-facing screens."
        actions={<StatusBadge label="Redirecting" tone="blue" />}
      />
      <Section>
        <Card>
          <p className="text-sm leading-6 text-slate-600">Taking you to the platform trial run section.</p>
          <div className="mt-4">
            <ButtonLink href="/platform#trial">Open platform trial run</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  );
}
