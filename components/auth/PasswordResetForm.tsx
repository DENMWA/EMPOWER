"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Card } from "@/components/ui";
import { consumeAuthRedirectSession, getAuthRedirectError, updatePassword } from "@/lib/supabase-auth";

export function PasswordResetForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const redirectError = getAuthRedirectError();
    const accepted = consumeAuthRedirectSession();
    setReady(accepted);
    if (redirectError) {
      setMessage(`This reset link could not be used: ${redirectError}.`);
    } else if (!accepted) {
      setMessage("This reset link is invalid or has expired. Request a new link from the sign-in page.");
    }
  }, []);

  async function savePassword() {
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setComplete(true);
      setMessage("Your password has been updated. Signing you in...");
      window.setTimeout(() => window.location.assign("/dashboard"), 900);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl border-teal-100 p-6 sm:p-8">
      {complete ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto text-emerald-600" size={36} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-ink">Password updated</h2>
          <p className="mt-2 text-sm text-slate-600">You are signed in. Opening your dashboard...</p>
          <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift hover:bg-slate-800">
            Continue to dashboard
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <KeyRound size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">Choose a new password</h2>
              <p className="mt-1 text-sm text-slate-600">Use at least 8 characters.</p>
            </div>
          </div>

          {ready ? (
            <div className="mt-6 grid gap-4">
              <PasswordField label="New password" value={password} onChange={setPassword} />
              <PasswordField label="Confirm new password" value={confirmation} onChange={setConfirmation} />
              <button type="button" disabled={busy} onClick={savePassword} className="inline-flex min-h-12 items-center justify-center rounded-md bg-sea px-5 text-sm font-semibold text-white shadow-lift hover:bg-teal-800 disabled:cursor-wait disabled:bg-slate-400">
                {busy ? "Updating password..." : "Update password"}
              </button>
            </div>
          ) : (
            <Link href="/signin" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
              Return to sign in
            </Link>
          )}

          {message ? <p className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{message}</p> : null}
        </>
      )}
    </Card>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm" />
    </label>
  );
}
