"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Card, PageHeader, Section } from "@/components/ui";
import { getAuthenticatedApiHeaders, getCurrentAuthStatus, signInWithPassword } from "@/lib/supabase-auth";

const verificationWindowMs = 15 * 60 * 1000;

function getVerificationKey(userId: string) {
  return `empowernotes:settings-verified:${userId}`;
}

export function SettingsSecurityGate({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = getCurrentAuthStatus();

  useEffect(() => {
    if (!auth.userId) {
      setChecked(true);
      return;
    }
    const verifiedAt = Number(window.sessionStorage.getItem(getVerificationKey(auth.userId)) || "0");
    setUnlocked(Date.now() - verifiedAt < verificationWindowMs);
    setChecked(true);
  }, [auth.userId]);

  async function verifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.email || !password) {
      setMessage("Enter your administrator password.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await signInWithPassword(auth.email, password);
      if (result.error) {
        setMessage("Password verification failed. Check your password and try again.");
        return;
      }

      const accessResponse = await fetch("/api/auth/access?mode=admin", {
        headers: getAuthenticatedApiHeaders(),
        cache: "no-store"
      });
      const access = await accessResponse.json() as { allowed?: boolean };
      if (!accessResponse.ok || !access.allowed) {
        setMessage("This account does not have permission to change organisation settings.");
        return;
      }

      window.sessionStorage.setItem(getVerificationKey(auth.userId), String(Date.now()));
      setPassword("");
      setUnlocked(true);
    } catch {
      setMessage("Secure verification could not be completed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!checked) return <div className="min-h-[55vh] bg-mist" aria-label="Checking settings verification" />;
  if (unlocked) return <>{children}</>;

  return (
    <>
      <PageHeader
        eyebrow="Protected settings"
        title="Confirm your administrator password"
        description="Organisation settings contain sensitive access, branding, security and plan controls. Confirm your own password to continue."
      />
      <Section>
        <Card className="mx-auto max-w-lg border-teal-200 bg-white shadow-lift">
          <span className="grid h-12 w-12 place-items-center rounded-md bg-mint text-teal-900"><LockKeyhole size={22} aria-hidden="true" /></span>
          <h2 className="mt-4 text-xl font-bold text-ink">Settings verification</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Signed in as <span className="font-semibold text-ink">{auth.email || "administrator"}</span>. Access remains unlocked for 15 minutes in this browser tab.</p>
          <form className="mt-5 grid gap-4" onSubmit={verifyPassword}>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Administrator password
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm" autoFocus />
            </label>
            <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              <ShieldCheck size={17} aria-hidden="true" />
              {busy ? "Verifying..." : "Unlock settings"}
            </button>
          </form>
          {message ? <p aria-live="polite" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
        </Card>
      </Section>
    </>
  );
}
