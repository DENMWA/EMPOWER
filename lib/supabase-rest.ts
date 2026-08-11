import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

type SupabaseMethod = "GET" | "POST" | "PATCH";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getStoredAccessToken() {
  if (typeof window === "undefined") return "";

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) || "";
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as { access_token?: string; currentSession?: { access_token?: string } };
      return parsed.access_token || parsed.currentSession?.access_token || "";
    }
  } catch {
    return "";
  }

  return "";
}

export function getCurrentUserId() {
  const token = getStoredAccessToken();
  if (!token) return "";

  try {
    const decoded = decodeJwtPayload<{ sub?: string }>(token);
    return decoded.sub || "";
  } catch {
    return "";
  }
}

export const activeOrganisationUpdatedEvent = "empowernotes:active-organisation-updated";

export function getCachedOrganisationId() {
  if (typeof window === "undefined") return "";
  const userId = getCurrentUserId();
  if (!userId) return "";
  return window.sessionStorage.getItem(`empowernotes:active-organisation:${userId}`) || "";
}

function cacheActiveOrganisationId(organisationId: string) {
  if (typeof window === "undefined") return;
  const userId = getCurrentUserId();
  if (!userId) return;
  const key = `empowernotes:active-organisation:${userId}`;
  const previous = window.sessionStorage.getItem(key) || "";
  if (!organisationId) window.sessionStorage.removeItem(key);
  else window.sessionStorage.setItem(key, organisationId);
  if (previous !== organisationId) window.dispatchEvent(new CustomEvent(activeOrganisationUpdatedEvent, { detail: { previous, current: organisationId } }));
}

export function decodeJwtPayload<T>(token: string): T {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Invalid access token.");

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(window.atob(paddedBase64)) as T;
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseProjectConfig() {
  return {
    supabaseUrl,
    supabaseAnonKey,
    accessToken: getStoredAccessToken()
  };
}

export async function supabaseRequest<T>(table: string, options: {
  method?: SupabaseMethod;
  query?: string;
  body?: unknown;
  prefer?: string;
} = {}) {
  if (!supabaseUrl || !supabaseAnonKey) return { data: null as T | null, error: "Cloud workspace is not configured." };

  const token = getStoredAccessToken() || supabaseAnonKey;
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${options.query ? `?${options.query}` : ""}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    return { data: null as T | null, error: error || response.statusText };
  }

  if (response.status === 204) return { data: null as T | null, error: "" };

  return { data: await response.json() as T, error: "" };
}

export async function supabaseRpc<T>(functionName: string, body: unknown) {
  if (!supabaseUrl || !supabaseAnonKey) return { data: null as T | null, error: "Cloud workspace is not configured." };

  const token = getStoredAccessToken() || supabaseAnonKey;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    let error = response.statusText;

    try {
      const parsed = JSON.parse(responseBody) as { message?: string };
      error = parsed.message || error;
    } catch {
      error = responseBody || error;
    }

    return { data: null as T | null, error };
  }

  return { data: await response.json() as T, error: "" };
}

export async function getCurrentOrganisationId() {
  const userId = getCurrentUserId();
  if (!userId) return "";

  const result = await supabaseRequest<Array<{ organisation_id: string }>>("users", {
    query: `select=organisation_id&id=eq.${encodeURIComponent(userId)}`
  });

  const organisationId = result.data?.[0]?.organisation_id || "";
  cacheActiveOrganisationId(organisationId);
  return organisationId;
}

export async function createCurrentUserOrganisation(input: {
  organisationName: string;
  ownerName: string;
  ownerEmail: string;
  providerType: "organisation" | "sole_provider";
  subscriptionTier?: SubscriptionTier;
  trialEndsAt?: string;
}) {
  const result = await supabaseRpc<string>("create_organisation_for_current_user", {
    organisation_name: input.organisationName,
    owner_name: input.ownerName,
    owner_email: input.ownerEmail,
    selected_provider_type: input.providerType
  });

  if (result.data && input.subscriptionTier) {
    const trial = await supabaseRpc<boolean>("configure_initial_organisation_trial", {
      selected_subscription_tier: input.subscriptionTier,
      selected_trial_ends_at: input.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Temporary deployment compatibility for projects where the Phase 3 RPC is not applied yet.
    if (trial.error) {
      await supabaseRequest("organisations", {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(result.data)}`,
        body: {
          subscription_tier: input.subscriptionTier,
          subscription_status: "trialing",
          subscription_current_period_end: input.trialEndsAt || null
        }
      });
    }
  }

  return result;
}
