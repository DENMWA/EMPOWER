"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, UserCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { consumeAuthRedirectSession, getCurrentAuthStatus, updatePassword } from "@/lib/supabase-auth";
import { getStoredAccessToken } from "@/lib/supabase-rest";

export function InviteAcceptanceForm() {
  const [invitationId, setInvitationId] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || "";
    const acceptedRedirect = consumeAuthRedirectSession();
    setInvitationId(id);
    setRequiresPassword(acceptedRedirect);
    setSignedIn(getCurrentAuthStatus().signedIn);
    if (!id) setMessage("This invitation link is incomplete. Ask the administrator to resend it.");
  }, []);

  async function acceptInvitation() {
    if (requiresPassword) {
      if (password.length < 8) return setMessage("Use a password with at least 8 characters.");
      if (password !== confirmation) return setMessage("The passwords do not match.");
    }
    setBusy(true);
    setMessage("");
    try {
      if (requiresPassword) {
        const passwordResult = await updatePassword(password);
        if (passwordResult.error) return setMessage(passwordResult.error);
      }
      const token = getStoredAccessToken();
      const response = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId })
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) return setMessage(result.error || "The invitation could not be accepted.");
      setComplete(true);
      setMessage("Invitation accepted. Opening your EmpowerNotes workspace...");
      window.setTimeout(() => window.location.assign("/dashboard"), 800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl border-teal-100 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        {complete ? <CheckCircle2 className="text-emerald-600" aria-hidden="true" /> : <UserCheck className="text-teal-700" aria-hidden="true" />}
        <div>
          <h2 className="text-xl font-bold text-ink">{complete ? "Invitation accepted" : "Join your workspace"}</h2>
          <p className="mt-1 text-sm text-slate-600">Your role and access are verified when you continue.</p>
        </div>
      </div>
      {!complete && requiresPassword ? (
        <div className="mt-6 grid gap-4">
          <PasswordField label="Create password" value={password} onChange={setPassword} />
          <PasswordField label="Confirm password" value={confirmation} onChange={setConfirmation} />
        </div>
      ) : null}
      {!complete && signedIn && invitationId ? (
        <button type="button" onClick={acceptInvitation} disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sea px-5 text-sm font-semibold text-white shadow-lift disabled:bg-slate-400">
          {busy ? "Verifying invitation..." : "Accept invitation"}
        </button>
      ) : null}
      {!complete && !signedIn && invitationId ? (
        <Link href={`/signin?next=${encodeURIComponent(`/auth/accept-invite?id=${invitationId}`)}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white">
          Sign in to accept
        </Link>
      ) : null}
      {message ? <p aria-live="polite" className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{message}</p> : null}
    </Card>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-700">{label}<input type="password" autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm" /></label>;
}
