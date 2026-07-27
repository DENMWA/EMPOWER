import { defaultSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptions/tiers";

const subscriptionTierKeys: SubscriptionTier[] = ["solo", "practice", "provider", "enterprise"];

export type ServerSubscriptionContext = {
  authenticated: boolean;
  userId: string;
  userRole: string;
  organisationId: string;
  tier: SubscriptionTier;
  status: string;
  trialEndsAt: string;
  currentPeriodEnd: string;
  enforcementMode: "monitor" | "enforce";
  source: "supabase" | "legacy-fallback";
  resolutionError: string;
};

export function normaliseSubscriptionTier(value: string | null): SubscriptionTier | null {
  if (value === "team") return "practice";
  if (value === "growth") return "provider";
  return subscriptionTierKeys.includes(value as SubscriptionTier) ? value as SubscriptionTier : null;
}

export function getLegacyRequestTier(request: Request): SubscriptionTier {
  return (
    normaliseSubscriptionTier(request.headers.get("x-empowernotes-tier")) ||
    normaliseSubscriptionTier(process.env.EMPOWERNOTES_DEFAULT_TIER || null) ||
    defaultSubscriptionTier
  );
}

export async function resolveServerSubscriptionContext(request: Request): Promise<ServerSubscriptionContext> {
  const fallback = createFallbackContext(request);
  const authorization = request.headers.get("authorization") || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return { ...fallback, resolutionError: "No authenticated session was supplied." };
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ...fallback, resolutionError: "Supabase server configuration is unavailable." };
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: authorization,
    "Content-Type": "application/json"
  };

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers,
      cache: "no-store"
    });
    if (!userResponse.ok) {
      return { ...fallback, resolutionError: `Authentication validation failed (${userResponse.status}).` };
    }

    const authUser = await userResponse.json() as { id?: string };
    if (!authUser.id) {
      return { ...fallback, resolutionError: "The authenticated user identifier was unavailable." };
    }

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?select=organisation_id,role&id=eq.${encodeURIComponent(authUser.id)}&limit=1`,
      { method: "GET", headers, cache: "no-store" }
    );
    if (!profileResponse.ok) {
      return { ...fallback, authenticated: true, userId: authUser.id, resolutionError: `User profile resolution failed (${profileResponse.status}).` };
    }

    const profiles = await profileResponse.json() as Array<{ organisation_id?: string; role?: string }>;
    const organisationId = profiles[0]?.organisation_id || "";
    const userRole = profiles[0]?.role || "";
    if (!organisationId) {
      return { ...fallback, authenticated: true, userId: authUser.id, resolutionError: "The user is not connected to an organisation." };
    }

    const organisationResponse = await fetch(
      `${supabaseUrl}/rest/v1/organisations?select=subscription_tier,subscription_status,subscription_enforcement_mode,trial_ends_at,subscription_current_period_end&id=eq.${encodeURIComponent(organisationId)}&limit=1`,
      { method: "GET", headers, cache: "no-store" }
    );
    if (!organisationResponse.ok) {
      return {
        ...fallback,
        authenticated: true,
        userId: authUser.id,
        organisationId,
        resolutionError: `Organisation subscription resolution failed (${organisationResponse.status}).`
      };
    }

    const organisations = await organisationResponse.json() as Array<{
      subscription_tier?: string;
      subscription_status?: string;
      subscription_enforcement_mode?: string;
      trial_ends_at?: string;
      subscription_current_period_end?: string;
    }>;
    const organisation = organisations[0];
    const tier = normaliseSubscriptionTier(organisation?.subscription_tier || null);
    if (!organisation || !tier) {
      return {
        ...fallback,
        authenticated: true,
        userId: authUser.id,
        organisationId,
        resolutionError: "The organisation subscription tier is missing or invalid."
      };
    }

    return {
      authenticated: true,
      userId: authUser.id,
      userRole,
      organisationId,
      tier,
      status: organisation.subscription_status || "trialing",
      trialEndsAt: organisation.trial_ends_at || "",
      currentPeriodEnd: organisation.subscription_current_period_end || "",
      enforcementMode: organisation.subscription_enforcement_mode === "enforce" ? "enforce" : "monitor",
      source: "supabase",
      resolutionError: ""
    };
  } catch {
    return { ...fallback, resolutionError: "The subscription service could not be reached." };
  }
}

async function recordObservation(context: ServerSubscriptionContext, entitlement: string, actionName: string, wouldBlock: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !context.organisationId) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/entitlement_observations`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        organisation_id: context.organisationId,
        user_id: context.userId || null,
        subscription_tier: context.tier,
        resource: entitlement,
        action_name: actionName,
        would_block: wouldBlock,
        enforcement_mode: context.enforcementMode,
        metadata: {
          source: context.source,
          subscription_status: context.status
        }
      }),
      cache: "no-store"
    });
  } catch {
    // Monitoring must never interrupt the requested product action.
  }
}

export async function observeServerEntitlement(context: ServerSubscriptionContext, entitlement: string, wouldBlock: boolean) {
  await recordObservation(context, entitlement, "api_entitlement_check", wouldBlock);
}

export async function recordServerUsage(context: ServerSubscriptionContext, resource: string) {
  await recordObservation(context, resource, "usage_consumed", false);
}

function createFallbackContext(request: Request): ServerSubscriptionContext {
  return {
    authenticated: false,
    userId: "",
    userRole: "",
    organisationId: "",
    tier: getLegacyRequestTier(request),
    status: "unknown",
    trialEndsAt: "",
    currentPeriodEnd: "",
    enforcementMode: "monitor",
    source: "legacy-fallback",
    resolutionError: ""
  };
}
