type SupabaseMethod = "GET" | "POST" | "PATCH";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getStoredAccessToken() {
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
    const payload = token.split(".")[1];
    const decoded = JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string };
    return decoded.sub || "";
  } catch {
    return "";
  }
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function supabaseRequest<T>(table: string, options: {
  method?: SupabaseMethod;
  query?: string;
  body?: unknown;
  prefer?: string;
} = {}) {
  if (!supabaseUrl || !supabaseAnonKey) return { data: null as T | null, error: "Supabase is not configured." };

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
  if (!supabaseUrl || !supabaseAnonKey) return { data: null as T | null, error: "Supabase is not configured." };

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
    const error = await response.text();
    return { data: null as T | null, error: error || response.statusText };
  }

  return { data: await response.json() as T, error: "" };
}

export async function getCurrentOrganisationId() {
  const userId = getCurrentUserId();
  if (!userId) return "";

  const result = await supabaseRequest<Array<{ organisation_id: string }>>("users", {
    query: `select=organisation_id&id=eq.${encodeURIComponent(userId)}`
  });

  return result.data?.[0]?.organisation_id || "";
}

export async function createCurrentUserOrganisation(input: {
  organisationName: string;
  ownerName: string;
  ownerEmail: string;
  providerType: "organisation" | "sole_provider";
}) {
  return supabaseRpc<string>("create_organisation_for_current_user", {
    organisation_name: input.organisationName,
    owner_name: input.ownerName,
    owner_email: input.ownerEmail,
    selected_provider_type: input.providerType
  });
}
