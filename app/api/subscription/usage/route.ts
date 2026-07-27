import { NextResponse } from "next/server";
import { getPlanCatalogueEntry } from "@/lib/subscriptions/catalog";
import { resolveServerSubscriptionContext } from "@/lib/subscriptions/server-context";
import { subscriptionTiers } from "@/lib/subscriptions/tiers";
import type { OrganisationUsageSnapshot, SubscriptionUsageResponse } from "@/lib/subscriptions/usage-types";

const managerRoles = new Set(["team_leader", "case_manager", "service_manager", "admin", "owner", "sole_provider"]);

export async function GET(request: Request) {
  const context = await resolveServerSubscriptionContext(request);
  if (!context.authenticated || context.source !== "supabase") {
    return NextResponse.json({ error: context.resolutionError || "Sign in to view organisation usage." }, { status: 401 });
  }
  if (!managerRoles.has(context.userRole)) {
    return NextResponse.json({ error: "Manager access is required to view subscription usage." }, { status: 403 });
  }

  const usage = await loadOrganisationUsage(context.organisationId);
  if (!usage) {
    return NextResponse.json({ error: "Live organisation usage is temporarily unavailable." }, { status: 503 });
  }

  const response: SubscriptionUsageResponse = {
    tier: context.tier,
    tierName: subscriptionTiers[context.tier].name,
    status: context.status,
    enforcementMode: context.enforcementMode,
    trialEndsAt: context.trialEndsAt,
    currentPeriodEnd: context.currentPeriodEnd,
    usage,
    limits: getPlanCatalogueEntry(context.tier).limits,
    source: "supabase"
  };

  return NextResponse.json(response);
}

async function loadOrganisationUsage(organisationId: string): Promise<OrganisationUsageSnapshot | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_organisation_plan_usage`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ target_organisation_id: organisationId }),
      cache: "no-store"
    });
    if (!response.ok) return null;

    const data = await response.json() as Partial<OrganisationUsageSnapshot> | null;
    if (!data) return null;

    return {
      activeParticipants: numberValue(data.activeParticipants),
      users: numberValue(data.users),
      houses: numberValue(data.houses),
      documents: numberValue(data.documents),
      documentsPerParticipant: numberValue(data.documentsPerParticipant),
      aiAnalysedNotesPerMonth: numberValue(data.aiAnalysedNotesPerMonth),
      planDocumentsProcessedPerMonth: numberValue(data.planDocumentsProcessedPerMonth),
      storageBytes: numberValue(data.storageBytes),
      invoiceLinesPerMonth: numberValue(data.invoiceLinesPerMonth),
      activeServiceAgreements: numberValue(data.activeServiceAgreements)
    };
  } catch {
    return null;
  }
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

