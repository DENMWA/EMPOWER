import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { observeServerEntitlement, recordServerUsage, resolveServerSubscriptionContext } from "@/lib/subscriptions/server-context";
import { subscriptionTiers } from "@/lib/subscriptions/tiers";

export async function checkRequestEntitlement(request: Request, entitlement: PlanToProgressEntitlementKey) {
  const context = await resolveServerSubscriptionContext(request);
  const configuredAllowed = Boolean(getPlanToProgressEntitlements(context.tier)[entitlement]);
  const subscriptionAllowsWrites = hasSubscriptionWriteAccess(context.status, context.trialEndsAt, context.graceEndsAt);
  const wouldBlock = !configuredAllowed || !subscriptionAllowsWrites;
  const allowed = context.enforcementMode === "enforce" ? !wouldBlock : true;
  await observeServerEntitlement(context, entitlement, wouldBlock);

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
    message: allowed
      ? ""
      : !subscriptionAllowsWrites
        ? "The organisation subscription does not currently allow new AI activity. Existing records remain available for viewing and export."
        : `${humaniseEntitlement(entitlement)} is available on a higher EmpowerNotes plan.`
  };
}

function hasSubscriptionWriteAccess(status: string, trialEndsAt: string, graceEndsAt: string) {
  if (status === "active") return true;
  if (status === "trialing") return !trialEndsAt || new Date(trialEndsAt).getTime() > Date.now();
  if (status === "past_due") return Boolean(graceEndsAt && new Date(graceEndsAt).getTime() > Date.now());
  return false;
}

function humaniseEntitlement(entitlement: string) {
  return entitlement.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
