"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LogOut, MailCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import {
  authSessionChangedEvent,
  consumeAuthRedirectSession,
  getAuthRedirectError,
  getCurrentAuthStatus,
  getDefaultAuthStatus,
  sendMagicLinkSignIn,
  signOutSupabaseSession
} from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

export function PlatformEmailSignIn() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [authStatus, setAuthStatus] = useState(getDefaultAuthStatus);
  const configured = isSupabaseConfigured();
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/platform";
    const requested = new URLSearchParams(window.location.search).get("next") || "/platform";
    return requested.startsWith("/") && !requested.startsWith("//") ? requested : "/platform";
  }, []);

  useEffect(() => {
    function syncAuthStatus() {
      setAuthStatus(getCurrentAuthStatus());
    }

    const acceptedLink = consumeAuthRedirectSession();
    syncAuthStatus();

    const redirectError = getAuthRedirectError();
    if (redirectError) {
      setMessage(`This sign-in link could not be used: ${redirectError}. Request a new email link and try again.`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (acceptedLink) {
      setMessage("Welcome back. Opening your developer console.");
      window.setTimeout(() => window.location.assign(nextPath), 450);
    }

    window.addEventListener(authSessionChangedEvent, syncAuthStatus);
    return () => window.removeEventListener(authSessionChangedEvent, syncAuthStatus);
  }, [nextPath]);

  async function sendLink() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage("Enter the platform owner email address first.");
      return;
    }

    setBusy(true);
    try {
      const result = await sendMagicLinkSignIn(cleanEmail, `/platform/signin?next=${encodeURIComponent(nextPath)}`);
      setMessage(result.error ? result.error : "Check your email and open the secure sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl border-sky-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Developer console</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Sign in by email</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">A private link will be sent to the approved platform owner email.</p>
        </div>
        <StatusBadge label={!configured ? "Setup required" : authStatus.signedIn ? "Signed in" : "Email link"} tone={!configured ? "red" : authStatus.signedIn ? "green" : "blue"} />
      </div>

      <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
        Email address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy || !configured} onClick={sendLink} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          <MailCheck size={17} aria-hidden="true" />
          {busy ? "Sending..." : "Send sign-in link"}
        </button>
        {authStatus.signedIn ? (
          <>
            <Link href="/platform" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
              Open console <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button type="button" onClick={() => { signOutSupabaseSession(); setMessage("Signed out from this browser."); }} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-red-700 hover:text-red-900">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </>
        ) : null}
      </div>

      {message ? <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{message}</p> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">The developer console still opens only for the configured platform owner account.</p>
    </Card>
  );
}
