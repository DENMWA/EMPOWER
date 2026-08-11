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

  const result = await supabaseRpc<string>("current_user_organisation_id", {});
  const organisationId = result.data || "";
  cacheActiveOrganisationId(organisationId);
  return organisationId;
}

type WorkspaceSwitchResult = { switched: boolean; error: string; requiresDraftDecision?: boolean };

export async function switchActiveOrganisation(organisationId: string, options: { discardUnsavedDrafts?: boolean } = {}): Promise<WorkspaceSwitchResult> {
  const token = getStoredAccessToken();
  if (!token) return { switched: false, error: "Sign in to switch workspace." };
  if (!options.discardUnsavedDrafts && hasUnsavedWorkspaceDrafts()) {
    return { switched: false, error: "Finish or save your unsaved draft before switching workspace.", requiresDraftDecision: true };
  }
  const response = await fetch("/api/access/switch", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ organisationId }),
    cache: "no-store"
  });
  const result = await response.json() as { ok?: boolean; error?: string };
  if (!response.ok || !result.ok) return { switched: false, error: result.error || "Workspace switching failed." };
  invalidateWorkspaceState(organisationId);
  return { switched: true, error: "" };
}

function hasUnsavedWorkspaceDrafts() {
  if (typeof window === "undefined") return false;
  return Object.keys(window.localStorage).concat(Object.keys(window.sessionStorage)).some((key) => /draft|upload-queue/i.test(key));
}

function invalidateWorkspaceState(organisationId: string) {
  if (typeof window === "undefined") return;
  const preservedDraftKeys = new Set(Object.keys(window.localStorage).concat(Object.keys(window.sessionStorage)).filter((key) => /draft/i.test(key)));
  const statePatterns = [/selected-participant/i, /active-house/i, /participant-search/i, /house-query/i, /invoice-context/i, /ai-context/i, /upload-queue/i, /handover-context/i, /shift-context/i];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (!preservedDraftKeys.has(key) && statePatterns.some((pattern) => pattern.test(key))) storage.removeItem(key);
    }
  }
  cacheActiveOrganisationId(organisationId);
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
