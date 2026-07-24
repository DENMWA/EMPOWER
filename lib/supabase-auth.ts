import { getSupabaseProjectConfig, getStoredAccessToken } from "@/lib/supabase-rest";

type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
  };
};

type MfaFactor = {
  id: string;
  friendly_name?: string;
  factor_type?: string;
  status?: string;
};

type MfaEnrollResponse = {
  id: string;
  type?: string;
  friendly_name?: string;
  totp?: {
    qr_code?: string;
    secret?: string;
    uri?: string;
  };
};

export const authSessionChangedEvent = "empowernotes:auth-session-updated";

export function getDefaultAuthStatus() {
  return { signedIn: false, userId: "", email: "", aal: "aal1" };
}

export function getAuthSessionStorageKey() {
  const { supabaseUrl } = getSupabaseProjectConfig();
  const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : "local";
  return `sb-${projectRef}-auth-token`;
}

export function getCurrentAuthStatus() {
  const token = getStoredAccessToken();
  if (!token) return getDefaultAuthStatus();

  try {
    const payload = token.split(".")[1];
    if (!payload) return getDefaultAuthStatus();
    const decoded = JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string; email?: string; aal?: string; exp?: number };
    if (!decoded.sub || (decoded.exp && decoded.exp * 1000 <= Date.now())) {
      signOutSupabaseSession();
      return getDefaultAuthStatus();
    }
    return {
      signedIn: true,
      userId: decoded.sub,
      email: decoded.email || "",
      aal: decoded.aal || "aal1"
    };
  } catch {
    signOutSupabaseSession();
    return getDefaultAuthStatus();
  }
}

export async function signUpWithPassword(email: string, password: string) {
  const result = await authRequest<AuthSession>("/signup", {
    email,
    password
  });
  if (result.data?.access_token) saveAuthSession(result.data);
  return result;
}

export async function signInWithPassword(email: string, password: string) {
  const result = await authRequest<AuthSession>("/token?grant_type=password", {
    email,
    password
  });
  if (result.data?.access_token) saveAuthSession(result.data);
  return result;
}

export async function sendEmailOtp(email: string) {
  return authRequest<{ message?: string }>("/otp", {
    email,
    create_user: false
  });
}

export async function sendPhoneOtp(phone: string) {
  return authRequest<{ message?: string }>("/otp", {
    phone,
    create_user: false
  });
}

export async function verifyEmailOtp(email: string, token: string) {
  const result = await authRequest<AuthSession>("/verify", {
    email,
    token,
    type: "email"
  });
  if (result.data?.access_token) saveAuthSession(result.data);
  return result;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const result = await authRequest<AuthSession>("/verify", {
    phone,
    token,
    type: "sms"
  });
  if (result.data?.access_token) saveAuthSession(result.data);
  return result;
}

export function signOutSupabaseSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getAuthSessionStorageKey());
  window.dispatchEvent(new Event(authSessionChangedEvent));
}

export function consumeAuthRedirectSession() {
  if (typeof window === "undefined" || !window.location.hash.includes("access_token=")) return false;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return false;

  const expiresIn = Number(params.get("expires_in") || "3600");
  saveAuthSession({
    access_token: accessToken,
    refresh_token: params.get("refresh_token") || undefined,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn
  });
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return true;
}

export async function listMfaFactors() {
  return authRequest<{ all?: MfaFactor[]; totp?: MfaFactor[] }>("/factors", undefined, "GET");
}

export async function enrollTotpFactor(friendlyName = "EmpowerNotes authenticator") {
  return authRequest<MfaEnrollResponse>("/factors", {
    factor_type: "totp",
    friendly_name: friendlyName
  });
}

export async function challengeMfaFactor(factorId: string) {
  return authRequest<{ id: string }>("/factors/" + encodeURIComponent(factorId) + "/challenge", {});
}

export async function verifyMfaFactor(factorId: string, challengeId: string, code: string) {
  const result = await authRequest<AuthSession>("/factors/" + encodeURIComponent(factorId) + "/verify", {
    challenge_id: challengeId,
    code
  });
  if (result.data?.access_token) saveAuthSession(result.data);
  return result;
}

function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getAuthSessionStorageKey(), JSON.stringify({
    ...session,
    currentSession: session
  }));
  window.dispatchEvent(new Event(authSessionChangedEvent));
}

async function authRequest<T>(path: string, body?: unknown, method: "GET" | "POST" = "POST") {
  const { supabaseUrl, supabaseAnonKey, accessToken } = getSupabaseProjectConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { data: null as T | null, error: "Secure sign-in is not configured." };

  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    return { data: null as T | null, error: getReadableAuthError(error || response.statusText) };
  }

  return { data: await response.json() as T, error: "" };
}

function getReadableAuthError(error: string) {
  try {
    const parsed = JSON.parse(error) as { msg?: string; message?: string; error_description?: string };
    return parsed.msg || parsed.message || parsed.error_description || error;
  } catch {
    return error;
  }
}
