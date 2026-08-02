import { NextResponse } from "next/server";
import { getPlanCatalogueEntry } from "@/lib/subscriptions/catalog";
import { resolveServerSubscriptionContext } from "@/lib/subscriptions/server-context";
import { hasSubscriptionWriteAccess } from "@/lib/subscriptions/server-gate";

const categories = new Set(["operations", "billing", "intelligence"]);

export async function GET(request: Request) {
  const context = await resolveServerSubscriptionContext(request);
  if (!context.authenticated || context.source !== "supabase") {
    return NextResponse.json({ error: context.resolutionError || "Sign in to check plan access." }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "";
  const feature = url.searchParams.get("feature") || "";
  if (!categories.has(category) || !feature) {
    return NextResponse.json({ error: "Choose a valid subscription capability." }, { status: 400 });
  }

  const catalogue = getPlanCatalogueEntry(context.tier);
  const capabilities = catalogue[category as "operations" | "billing" | "intelligence"] as unknown as Record<string, unknown>;
  if (!(feature in capabilities) || typeof capabilities[feature] !== "boolean") {
    return NextResponse.json({ error: "Choose a valid subscription capability." }, { status: 400 });
  }

  const subscriptionActive = hasSubscriptionWriteAccess(context.status, context.trialEndsAt, context.graceEndsAt);
  const configuredAllowed = Boolean(capabilities[feature]);
  return NextResponse.json({
    allowed: configuredAllowed && (context.enforcementMode !== "enforce" || subscriptionActive),
    configuredAllowed,
    subscriptionActive,
    tier: context.tier,
    status: context.status,
    enforcementMode: context.enforcementMode
  });
}
