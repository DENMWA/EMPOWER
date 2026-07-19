"use client";

import { useEffect, useMemo, useState } from "react";
import { useEntitlement } from "@/hooks/useEntitlement";
import { Card, StatusBadge } from "@/components/ui";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { samplePlanExtractions, participantProgressGoals } from "@/lib/plan-progress/sample-data";
import { formatPlanLimit, getUsageLimitRows } from "@/lib/subscriptions/limits";
import { GoalProgressCard } from "@/components/participants/progress/GoalProgressCard";
import { PlanUploadReviewCard } from "@/components/participants/plans/PlanUploadReviewCard";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { documents, participants, progressNotes, type Participant } from "@/lib/sample-data";

type ProgressClient = Participant & { colourSchemeId?: string };

function getColourSchemeId(client: ProgressClient | undefined) {
  return typeof client?.colourSchemeId === "string" ? client.colourSchemeId : undefined;
}

export function ProgressDashboard() {
  const { tier, setTier, entitlements } = useEntitlement();
  const [savedClients, setSavedClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    getTenantClients().then((clients) => {
      setSavedClients(clients);
      setSelectedClientId((current) => current || clients[0]?.id || participants[0]?.id || "");
    }).catch(() => {
      setSavedClients([]);
      setSelectedClientId((current) => current || participants[0]?.id || "");
    });
  }, []);

  const allClients: ProgressClient[] = savedClients.length ? savedClients : participants;
  const selectedClient = allClients.find((client) => client.id === selectedClientId) || allClients[0];
  const selectedColour = selectedClient ? getClientColourScheme(selectedClient.id, getColourSchemeId(selectedClient)) : getClientColourScheme("default");
  const clientNotes = useMemo(() => progressNotes.filter((note) => note.participantId === selectedClient?.id), [selectedClient?.id]);
  const clientDocuments = useMemo(() => documents.filter((document) => document.participantId === selectedClient?.id), [selectedClient?.id]);
  const clientGoals = useMemo(() => participantProgressGoals.filter((goal) => goal.participantId === selectedClient?.id), [selectedClient?.id]);
  const clientExtractions = selectedClient?.id === "client-b" ? samplePlanExtractions : [];
  const selectedGoal = clientGoals[0];

  return (
    <div className="space-y-6">
      <Card className={`border-l-4 ${selectedColour.border}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plan-to-Progress Intelligence</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Client-specific baseline to progress evidence</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Choose one client, upload their plan, review AI extraction, verify baselines, and track progress evidence without mixing records across clients.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={subscriptionTiers[tier].name} tone="blue" />
            {selectedClient ? <span className={`rounded-md px-3 py-1 text-sm font-semibold ${selectedColour.badge}`}>{selectedClient.name}</span> : null}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_1fr]">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Client
            <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClient?.id || ""} onChange={(event) => setSelectedClientId(event.target.value)}>
              {allClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Subscription tier for testing
            <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={tier} onChange={(event) => setTier(event.target.value as SubscriptionTier)}>
              {Object.entries(subscriptionTiers).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
            </select>
          </label>
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
            {getUsageLimitRows(tier).slice(0, 6).map((row) => (
              <p key={row.label} className="rounded-md bg-slate-50 p-2"><span className="font-semibold">{row.label}:</span> {formatPlanLimit(row.value, row.unit)}</p>
            ))}
          </div>
        </div>
        {selectedClient ? (
          <div className={`mt-5 grid gap-3 rounded-md p-4 ${selectedColour.panel} md:grid-cols-3`}>
            <p className="text-sm leading-6 text-slate-700"><span className={`font-semibold ${selectedColour.text}`}>Support needs:</span> {selectedClient.supportNeeds}</p>
            <p className="text-sm leading-6 text-slate-700"><span className={`font-semibold ${selectedColour.text}`}>Goals:</span> {selectedClient.goals.length ? selectedClient.goals.join(", ") : "No goals added yet."}</p>
            <p className="text-sm leading-6 text-slate-700"><span className={`font-semibold ${selectedColour.text}`}>Risks:</span> {selectedClient.riskAlerts.length ? selectedClient.riskAlerts.join(", ") : "No risk alerts added."}</p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Client goals" value={selectedClient?.goals.length || clientGoals.length} />
        <SummaryCard label="Client records" value={clientNotes.length + clientDocuments.length} />
        <SummaryCard label="Client documents" value={clientDocuments.length} />
      </div>

      <PlanUploadReviewCard participantName={selectedClient?.name} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Human verification queue</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">AI extraction for {selectedClient?.name || "selected client"} is reviewed before becoming a baseline</h2>
          </div>
          <StatusBadge label="Authorised review required" tone="amber" />
        </div>
        <div className="mt-4 grid gap-3">
          {clientExtractions.length ? (
            clientExtractions.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <StatusBadge label={`${Math.round(item.confidenceScore * 100)}% confidence`} tone="blue" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.interpretedText}</p>
                <p className="mt-2 text-xs text-slate-500">Source: page {item.sourcePage}, {item.sourceSection}. Status: {item.verificationStatus}.</p>
              </div>
            ))
          ) : (
            <div className={`rounded-md border border-dashed p-4 ${selectedColour.border} ${selectedColour.panel}`}>
              <p className="font-semibold text-ink">No verified extraction items yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Upload this client's plan above, review the ChatGPT extraction, then queue authorised baseline verification.</p>
            </div>
          )}
        </div>
      </Card>

      {selectedGoal ? (
        <FeatureGate entitlement="basicCharts">
          <GoalProgressCard goal={selectedGoal} />
        </FeatureGate>
      ) : (
        <Card className={`border-l-4 ${selectedColour.border}`}>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">No verified baseline yet</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Create or verify a goal baseline for {selectedClient?.name || "this client"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Once a plan item is verified for this client, their progress chart will use only their linked notes, incidents, documents, and support evidence.</p>
        </Card>
      )}

      <FeatureGate entitlement="advancedCharts">
        <Card className="border-teal-100">
          <h2 className="text-xl font-semibold text-ink">Team+ chart intelligence</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Support-level trend, evidence count, evidence-strength trend and contradiction indicators are enabled on this tier.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge label="Support trend" tone={entitlements.advancedCharts ? "green" : "amber"} />
            <StatusBadge label="Evidence strength" tone={entitlements.evidenceStrengthScoring ? "green" : "amber"} />
            <StatusBadge label="Contradiction detection" tone={entitlements.contradictionDetection ? "green" : "amber"} />
          </div>
        </Card>
      </FeatureGate>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </Card>
  );
}
