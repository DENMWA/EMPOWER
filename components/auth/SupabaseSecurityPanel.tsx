"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import {
  authSessionChangedEvent,
  consumeAuthRedirectSession,
  getAuthRedirectError,
  getCurrentAuthStatus,
  getDefaultAuthStatus,
  sendPasswordResetEmail,
  signInWithPassword,
  signOutSupabaseSession
} from "@/lib/supabase-auth";
import { getCurrentUserId, isSupabaseConfigured, supabaseRequest } from "@/lib/supabase-rest";
import { completePendingOnboarding } from "@/lib/pending-onboarding";

export function SupabaseSecurityPanel({ redirectAfterSignIn = false }: { redirectAfterSignIn?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authStatus, setAuthStatus] = useState(getDefaultAuthStatus);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  const continueToRequestedPage = useCallback(async () => {
    if (!redirectAfterSignIn || typeof window === "undefined") return;
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    const safeRequestedPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "";
    const userId = getCurrentUserId();
    let defaultPath = "/dashboard";

    if (userId) {
      const profile = await supabaseRequest<Array<{ role?: string }>>("users", {
        query: `select=role&id=eq.${encodeURIComponent(userId)}&limit=1`
      });
      const role = profile.data?.[0]?.role || "";
      if (["owner", "admin", "service_manager", "sole_provider"].includes(role)) {
        defaultPath = "/admin";
      }
    }

    window.location.assign(safeRequestedPath || defaultPath);
  }, [redirectAfterSignIn]);

  useEffect(() => {
    function syncAuthStatus() {
      setAuthStatus(getCurrentAuthStatus());
    }

    if (window.location.hash.includes("type=recovery")) {
      window.location.replace(`/reset-password${window.location.hash}`);
      return;
    }
    const acceptedInvite = consumeAuthRedirectSession();
    syncAuthStatus();
    const redirectError = getAuthRedirectError();
    if (redirectError) {
      setMessage(`This confirmation link could not be used: ${redirectError}. Request a new confirmation email and try again.`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (acceptedInvite) {
      completePendingOnboarding().then((setup) => {
        if (setup.error) {
          setMessage(setup.error);
          return;
        }
        setMessage(setup.completed ? "Account confirmed. Your organisation workspace is ready." : "Invitation accepted. You are now signed in to your organisation workspace.");
        if (redirectAfterSignIn) void continueToRequestedPage();
      });
    }
    window.addEventListener(authSessionChangedEvent, syncAuthStatus);
    return () => window.removeEventListener(authSessionChangedEvent, syncAuthStatus);
  }, [continueToRequestedPage, redirectAfterSignIn]);

  async function signIn() {
    await withBusy(async () => {
      const result = await signInWithPassword(email.trim(), password);
      if (result.error) {
        setMessage(result.error);
        return;
      }

      setMessage("Signed in. Your workspace is ready.");
      const setup = await completePendingOnboarding();
      if (setup.error) {
        setMessage(setup.error);
        return;
      }
      await continueToRequestedPage();
    });
  }

  async function requestPasswordReset() {
    if (!email.trim()) {
      setMessage("Enter your email address first.");
      return;
    }
    await withBusy(async () => {
      const result = await sendPasswordResetEmail(email.trim().toLowerCase());
      setMessage(result.error
        ? result.error
        : "If an account exists for that email, a secure password reset link has been sent.");
    });
  }

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Account access</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Sign in</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Secure access to your assigned workspace.</p>
        </div>
        <StatusBadge label={!configured ? "Account setup required" : authStatus.signedIn ? "Signed in" : "Sign in required"} tone={!configured ? "red" : authStatus.signedIn ? "blue" : "amber"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy || !configured} onClick={signIn} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          <KeyRound size={17} aria-hidden="true" />
          Sign in
        </button>
        <button type="button" disabled={busy || !configured} onClick={requestPasswordReset} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:text-slate-400">
          Forgot password?
        </button>
        {authStatus.signedIn ? (
          <button type="button" disabled={busy} onClick={() => { signOutSupabaseSession(); setMessage("Signed out from this browser."); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:border-red-400">
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{message}</p> : null}
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete, inputMode, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric";
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm" />
    </label>
  );
}
