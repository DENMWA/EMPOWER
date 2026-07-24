"use client";

import { useEffect } from "react";
import { ButtonLink, Card, PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AuditPacksRedirectPage() {
  useEffect(() => {
    window.location.replace("/admin/audit-packs");
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Admin-only audit packs"
        title="Audit packs have moved to admin"
        description="Audit packs are now locked behind admin access so workers only see the tools relevant to their role."
        actions={<StatusBadge label="Redirecting" tone="blue" />}
      />
      <Section>
        <Card>
          <p className="text-sm leading-6 text-slate-600">Taking you to the admin audit pack workspace.</p>
          <div className="mt-4">
            <ButtonLink href="/admin/audit-packs">Open admin audit packs</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  );
}
