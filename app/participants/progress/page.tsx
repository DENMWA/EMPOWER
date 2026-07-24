"use client";

import { useEffect } from "react";
import { ButtonLink, Card, PageHeader, Section, StatusBadge } from "@/components/ui";

export default function ParticipantProgressPage() {
  useEffect(() => {
    window.location.replace("/admin/progress");
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Admin progress intelligence"
        title="Progress intelligence has moved to admin"
        description="Plan-to-progress reporting is now an admin-only workspace so client baselines and comparative reporting stay manager controlled."
        actions={<StatusBadge label="Redirecting" tone="blue" />}
      />
      <Section>
        <Card>
          <p className="text-sm leading-6 text-slate-600">Taking you to the admin progress intelligence workspace.</p>
          <div className="mt-4">
            <ButtonLink href="/admin/progress">Open admin progress intelligence</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  );
}
