import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { checkRequestEntitlement } from "@/lib/subscriptions/server-gate";
import type { FeaturePermission } from "@/lib/feature-permissions";

type RateLimitResult = {
  allowed?: boolean;
  retryAfterSeconds?: number;
};

export async function guardAiRequest(request: Request, options: {
    entitlement: PlanToProgressEntitlementKey;
    action: "improve_note" | "parse_plan" | "transcribe_note";
    permission?: FeaturePermission;
}) {
  const gate = await checkRequestEntitlement(request, options.entitlement);

  if (!gate.authenticated || !gate.userId || !gate.organisationId) {
    return {
      ok: false as const,
      status: 401,
      message: gate.resolutionError || "Sign in to use EmpowerNotes AI.",
      retryAfterSeconds: 0,
      gate
    };
  }

  if (!gate.allowed) {
    return {
      ok: false as const,
      status: 403,
      message: gate.message,
      retryAfterSeconds: 0,
      gate
    };
  }

  const requiredPermission = options.permission || (options.action === "parse_plan" ? "documents.manage" : "notes.create");
  if (!gate.permissions.includes(requiredPermission)) {
    console.warn(JSON.stringify({ event: "ai_scope_denied", actorUserId: gate.userId, endpoint: new URL(request.url).pathname, correlationId: request.headers.get("x-correlation-id") || "", timestamp: new Date().toISOString() }));
    return {
      ok: false as const,
      status: 403,
      message: "This AI function has not been assigned to your organisation role.",
      retryAfterSeconds: 0,
      gate
    };
  }

  if (options.action === "improve_note") {
    const monthlyLimit = getPlanToProgressEntitlements(gate.tier).maxAiAnalysedNotesPerMonth;
    const monthlyUsage = await getMonthlyAiUsage(gate.organisationId);
    if (monthlyUsage === null && gate.enforcementMode === "enforce") {
      return {
        ok: false as const,
        status: 503,
        message: "AI usage could not be verified securely. Try again shortly.",
        retryAfterSeconds: 30,
        gate
      };
    }
    if (monthlyLimit !== null && monthlyUsage !== null && monthlyUsage >= monthlyLimit && gate.enforcementMode === "enforce") {
      return {
        ok: false as const,
        status: 429,
        message: `This organisation has reached its monthly allowance of ${monthlyLimit.toLocaleString("en-AU")} AI-analysed notes.`,
        retryAfterSeconds: secondsUntilNextMonth(),
        gate
      };
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!supabaseUrl || !supabaseAnonKey || !authorization.startsWith("Bearer ")) {
    return {
      ok: false as const,
      status: 503,
      message: "AI request protection is not configured.",
      retryAfterSeconds: 0,
      gate
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_ai_rate_limit`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authorization,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requested_action: options.action
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        ok: false as const,
        status: 503,
        message: "AI request protection is temporarily unavailable. Try again shortly.",
        retryAfterSeconds: 30,
        gate
      };
    }

    const rateLimit = await response.json() as RateLimitResult;
    if (!rateLimit.allowed) {
      return {
        ok: false as const,
        status: 429,
        message: "Too many AI requests. Wait a few minutes before trying again.",
        retryAfterSeconds: Math.max(1, Number(rateLimit.retryAfterSeconds) || 60),
        gate
      };
    }

    return { ok: true as const, gate };
  } catch {
    return {
      ok: false as const,
      status: 503,
      message: "AI request protection is temporarily unavailable. Try again shortly.",
      retryAfterSeconds: 30,
      gate
    };
  }
}

async function getMonthlyAiUsage(organisationId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !organisationId) return null;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const query = new URLSearchParams({
    select: "id",
    organisation_id: `eq.${organisationId}`,
    resource: "eq.enabled",
    action_name: "eq.usage_consumed",
    observed_at: `gte.${monthStart.toISOString()}`
  });

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/entitlement_observations?${query}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "count=exact",
        Range: "0-0"
      },
      cache: "no-store"
    });
    if (!response.ok) return null;
    const total = response.headers.get("content-range")?.split("/")[1];
    const parsed = Number(total);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function secondsUntilNextMonth() {
  const now = new Date();
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(60, Math.ceil((nextMonth - now.getTime()) / 1000));
}
