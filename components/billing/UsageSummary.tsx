"use client";

import { useEffect, useMemo, useState } from "react";
import { UsageLimitNotice } from "@/components/subscription/UsageLimitNotice";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients } from "@/lib/client-records";
import { getTenantDocumentRecords } from "@/lib/document-records";
import { getTenantRetainedRecords } from "@/lib/retained-records";
import { getTenantStaffInvites } from "@/lib/staff-records";
import { getUsageLimitRows } from "@/lib/subscriptions/limits";
import { getCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";

type UsageCounts = {
  clients: number;
  users: number;
  documents: number;
  aiNotes: number;
};

export function UsageSummary() {
  const [tier, setTier] = useState<SubscriptionTier>("practice");
  const [usage, setUsage] = useState<UsageCounts>({ clients: 0, users: 0, documents: 0, aiNotes: 0 });
  const [loading, setLoading] = useState(true);
  const usageRows = useMemo(() => {
    const maxDocumentsPerParticipant = usage.clients ? Math.ceil(usage.documents / usage.clients) : 0;
    const used: Record<string, number> = {
      "Active participants": usage.clients,
      "Users": usage.users,
      "Documents per participant": maxDocumentsPerParticipant,
      "AI analysed notes/month": usage.aiNotes,
      "Storage": usage.documents * 2 * 1024 * 1024,
      "Approval stages": 2
    };

    return getUsageLimitRows(tier).map((row) => ({ ...row, used: used[row.label] ?? 0 }));
  }, [tier, usage]);

  useEffect(() => {
    setTier(getCurrentSubscriptionTier());

    async function loadUsage() {
      setLoading(true);
      const [clients, staff, documents, progressNotes] = await Promise.all([
        getTenantClients().catch(() => []),
        getTenantStaffInvites().catch(() => []),
        getTenantDocumentRecords().catch(() => []),
        getTenantRetainedRecords("progress-note").catch(() => [])
      ]);
      setUsage({
        clients: clients.length,
        users: staff.length,
        documents: documents.length,
        aiNotes: progressNotes.length
      });
      setLoading(false);
    }

    loadUsage();
    window.addEventListener("empowernotes:documents-updated", loadUsage);
    window.addEventListener("empowernotes:retained-records-updated", loadUsage);
    return () => {
      window.removeEventListener("empowernotes:documents-updated", loadUsage);
      window.removeEventListener("empowernotes:retained-records-updated", loadUsage);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Live usage</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Usage Summary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Counts are read from saved clients, staff, documents, and retained progress-note records for this testing workspace.</p>
          </div>
          <StatusBadge label={loading ? "Refreshing" : subscriptionTiers[tier].name} tone="blue" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {usageRows.map((row) => (
          <UsageLimitNotice key={row.label} label={row.label} used={row.used} limit={row.value} unit={row.unit} />
        ))}
      </div>
    </div>
  );
}
