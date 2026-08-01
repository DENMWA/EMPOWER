import type { PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { checkRequestEntitlement } from "@/lib/subscriptions/server-gate";

type RateLimitResult = {
  allowed?: boolean;
  retryAfterSeconds?: number;
};

export async function guardAiRequest(request: Request, options: {
  entitlement: PlanToProgressEntitlementKey;
  action: "improve_note" | "parse_plan";
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
