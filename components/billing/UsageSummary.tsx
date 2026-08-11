"use client";

import { useEffect, useMemo, useState } from "react";
import { UsageLimitNotice } from "@/components/subscription/UsageLimitNotice";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients } from "@/lib/client-records";
import { getTenantDocumentRecords } from "@/lib/document-records";
import { getTenantHouses } from "@/lib/house-records";
import { getNativeBillingRecords } from "@/lib/native-billing";
import { getTenantRetainedRecords } from "@/lib/retained-records";
import { getTenantStaffInvites } from "@/lib/staff-records";
import { getPlanCatalogueEntry, type PlanLimits } from "@/lib/subscriptions/catalog";
import { getCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { getLiveSubscriptionUsage } from "@/lib/subscriptions/client-usage";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import type { OrganisationUsageSnapshot } from "@/lib/subscriptions/usage-types";

const emptyUsage: OrganisationUsageSnapshot = {
  activeParticipants: 0,
  users: 0,
  houses: 0,
  documents: 0,
  documentsPerParticipant: 0,
  aiAnalysedNotesPerMonth: 0,
  planDocumentsProcessedPerMonth: 0,
  storageBytes: 0,
  invoiceLinesPerMonth: 0,
  activeServiceAgreements: 0
};

export function UsageSummary() {
  const [tier, setTier] = useState<SubscriptionTier>("practice");
  const [usage, setUsage] = useState<OrganisationUsageSnapshot>(emptyUsage);
  const [limits, setLimits] = useState<PlanLimits>(getPlanCatalogueEntry("practice").limits);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "local-fallback">("local-fallback");
  const usageRows = useMemo(() => [
    { label: "Active participants", used: usage.activeParticipants, limit: limits.activeParticipants },
    { label: "Users", used: usage.users, limit: limits.users },
    { label: "Houses and services", used: usage.houses, limit: limits.houses },
    { label: "Documents per participant", used: usage.documentsPerParticipant, limit: limits.documentsPerParticipant },
    { label: "AI analysed notes this month", used: usage.aiAnalysedNotesPerMonth, limit: limits.aiAnalysedNotesPerMonth },
    { label: "Storage", used: usage.storageBytes, limit: limits.storageBytes, unit: "bytes" },
    { label: "Invoice lines this month", used: usage.invoiceLinesPerMonth, limit: limits.invoiceLinesPerMonth },
    { label: "Active service agreements", used: usage.activeServiceAgreements, limit: limits.activeServiceAgreements }
  ], [limits, usage]);

  useEffect(() => {
    async function loadUsage() {
      setLoading(true);
      const live = await getLiveSubscriptionUsage().catch(() => ({ data: null, error: "Unavailable" }));
      if (live.data) {
        setTier(live.data.tier);
        setLimits(live.data.limits);
        setUsage(live.data.usage);
        setSource("supabase");
        setLoading(false);
        return;
      }

      const fallbackTier = getCurrentSubscriptionTier();
      const [clients, staff, documents, notes, houses] = await Promise.all([
        getTenantClients().catch(() => []),
        getTenantStaffInvites().catch(() => []),
        getTenantDocumentRecords().catch(() => []),
        getTenantRetainedRecords("progress-note").catch(() => []),
        getTenantHouses().catch(() => [])
      ]);
      const billing = getNativeBillingRecords();
      const documentCounts = new Map<string, number>();
      documents.forEach((document) => {
        documentCounts.set(document.participantId, (documentCounts.get(document.participantId) || 0) + 1);
      });

      setTier(fallbackTier);
      setLimits(getPlanCatalogueEntry(fallbackTier).limits);
      setUsage({
        activeParticipants: clients.length,
        users: staff.length,
        houses: houses.length,
        documents: documents.length,
        documentsPerParticipant: Math.max(0, ...documentCounts.values()),
        aiAnalysedNotesPerMonth: notes.length,
        planDocumentsProcessedPerMonth: 0,
        storageBytes: documents.length * 2 * 1024 * 1024,
        invoiceLinesPerMonth: billing.invoiceLines.length,
        activeServiceAgreements: billing.agreements.filter((agreement) => agreement.status === "active").length
      });
      setSource("local-fallback");
      setLoading(false);
    }

    void loadUsage();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-sea">This month</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Usage</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={loading ? "Refreshing" : subscriptionTiers[tier].name} tone="blue" />
            <StatusBadge label={source === "supabase" ? "Live" : "Estimate"} tone={source === "supabase" ? "green" : "amber"} />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {usageRows.map((row) => (
          <UsageLimitNotice key={row.label} label={row.label} used={row.used} limit={row.limit} unit={row.unit} />
        ))}
      </div>
    </div>
  );
}
