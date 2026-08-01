import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { observeServerEntitlement, recordServerUsage, resolveServerSubscriptionContext } from "@/lib/subscriptions/server-context";
import { subscriptionTiers } from "@/lib/subscriptions/tiers";

export async function checkRequestEntitlement(request: Request, entitlement: PlanToProgressEntitlementKey) {
  const context = await resolveServerSubscriptionContext(request);
  const configuredAllowed = Boolean(getPlanToProgressEntitlements(context.tier)[entitlement]);
  const allowed = context.enforcementMode === "enforce" ? configuredAllowed : true;
  await observeServerEntitlement(context, entitlement, !configuredAllowed);

  return {
    allowed,
    configuredAllowed,
    authenticated: context.authenticated,
    userId: context.userId,
    userRole: context.userRole,
    organisationId: context.organisationId,
    tier: context.tier,
    tierName: subscriptionTiers[context.tier].name,
    source: context.source,
    enforcementMode: context.enforcementMode,
    resolutionError: context.resolutionError,
    recordUsage: () => recordServerUsage(context, entitlement),
    message: allowed ? "" : `${humaniseEntitlement(entitlement)} is available on a higher EmpowerNotes plan.`
  };
}

function humaniseEntitlement(entitlement: string) {
  return entitlement.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
