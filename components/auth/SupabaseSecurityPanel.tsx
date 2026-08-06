"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import {
  authSessionChangedEvent,
  challengeMfaFactor,
  consumeAuthRedirectSession,
  enrollTotpFactor,
  getAuthRedirectError,
  getCurrentAuthStatus,
  getDefaultAuthStatus,
  listMfaFactors,
  sendPasswordResetEmail,
  signInWithPassword,
  signOutSupabaseSession,
  updatePassword,
  verifyMfaFactor
} from "@/lib/supabase-auth";
import { getCurrentUserId, isSupabaseConfigured, supabaseRequest } from "@/lib/supabase-rest";
import { completePendingOnboarding } from "@/lib/pending-onboarding";

type EnrolledTotp = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

export function SupabaseSecurityPanel({ redirectAfterSignIn = false }: { redirectAfterSignIn?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [authStatus, setAuthStatus] = useState(getDefaultAuthStatus);
  const [totp, setTotp] = useState<EnrolledTotp | null>(null);
  const [factorId, setFactorId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const configured = isSupabaseConfigured();
  const mfaReady = authStatus.aal === "aal2";

  useEffect(() => {
    function syncAuthStatus() {
      setAuthStatus(getCurrentAuthStatus());
    }

    const isPasswordRecovery = window.location.pathname === "/reset-password"
      || window.location.hash.includes("type=recovery");
    const acceptedInvite = consumeAuthRedirectSession();
    setResetMode(isPasswordRecovery);
    syncAuthStatus();
    const redirectError = getAuthRedirectError();
    if (redirectError) {
      setMessage(`This confirmation link could not be used: ${redirectError}. Request a new confirmation email and try again.`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (acceptedInvite && isPasswordRecovery) {
      setMessage("Reset link verified. Choose a new password below.");
    } else if (acceptedInvite) {
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
  }, []);

  async function signIn() {
    await withBusy(async () => {
      const result = await signInWithPassword(email.trim(), password);
      if (result.error) {
        setMessage(result.error);
        return;
      }

      setMessage("Signed in. Cloud saves are now available for this user.");
      await loadVerifiedMfaFactor();
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

  async function saveNewPassword() {
    if (newPassword.length < 8) {
      setMessage("Use a new password with at least 8 characters.");
      return;
    }
    await withBusy(async () => {
      const result = await updatePassword(newPassword);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setNewPassword("");
      setResetMode(false);
      setMessage("Password updated successfully. You can now continue securely.");
      window.history.replaceState({}, document.title, "/signin");
    });
  }

  async function startTotpEnrollment() {
    await withBusy(async () => {
      const result = await enrollTotpFactor("EmpowerNotes TOTP");
      if (result.error || !result.data?.id) {
        setMessage(result.error || "Could not start 2FA setup.");
        return;
      }

      setTotp({
        factorId: result.data.id,
        qrCode: result.data.totp?.qr_code || "",
        secret: result.data.totp?.secret || "",
        uri: result.data.totp?.uri || ""
      });
      setFactorId(result.data.id);
      setMessage("Scan the QR code in an authenticator app, then enter the six-digit code.");
    });
  }

  async function verifyTotpCode() {
    await withBusy(async () => {
      const activeFactorId = factorId || totp?.factorId || await getFirstVerifiedFactorId();
      if (!activeFactorId) {
        setMessage("Set up 2FA first, then enter the authenticator code.");
        return;
      }

      const challenge = await challengeMfaFactor(activeFactorId);
      if (challenge.error || !challenge.data?.id) {
        setMessage(challenge.error || "Could not start 2FA challenge.");
        return;
      }

      const verification = await verifyMfaFactor(activeFactorId, challenge.data.id, code.trim());
      if (verification.error) {
        setMessage(verification.error);
        return;
      }

      setCode("");
      setTotp(null);
      setAuthStatus(getCurrentAuthStatus());
      setMessage("2FA verified. This session is now upgraded for safer access.");
      await continueToRequestedPage();
    });
  }

  async function loadVerifiedMfaFactor() {
    const verifiedFactorId = await getFirstVerifiedFactorId();
    if (verifiedFactorId) setFactorId(verifiedFactorId);
  }

  async function getFirstVerifiedFactorId() {
    const factors = await listMfaFactors();
    const verifiedTotp = [...(factors.data?.totp || []), ...(factors.data?.all || [])].find((factor) => factor.factor_type === "totp" && factor.status === "verified");
    return verifiedTotp?.id || "";
  }

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function continueToRequestedPage() {
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

    const safePath = safeRequestedPath || defaultPath;
    const privilegedPath = safePath === "/admin" || safePath.startsWith("/admin/") || safePath === "/platform" || safePath.startsWith("/platform/");
    if (privilegedPath && getCurrentAuthStatus().aal !== "aal2") {
      setMessage(factorId
        ? "Enter your authenticator code below to continue to privileged controls."
        : "Set up authenticator 2FA below before opening privileged controls.");
      return;
    }
    window.location.assign(safePath);
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Secure sign in and 2FA</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Secure cloud saving</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Sign in before creating or saving records so clients, staff, documents, notes, reports, and billing records save to your secure workspace instead of browser-only storage.
          </p>
        </div>
        <StatusBadge label={!configured ? "Cloud saving not configured" : mfaReady ? "2FA verified" : authStatus.signedIn ? "Signed in" : "Sign in required"} tone={!configured ? "red" : mfaReady ? "green" : authStatus.signedIn ? "blue" : "amber"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
      </div>

      {resetMode ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm font-semibold text-ink">Choose a new password</p>
          <p className="mt-1 text-sm text-slate-700">Use at least 8 characters and avoid reusing an old password.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="New password" value={newPassword} onChange={setNewPassword} type="password" autoComplete="new-password" />
            <button type="button" disabled={busy || newPassword.length < 8} onClick={saveNewPassword} className="self-end inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
              Update password
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy || !configured} onClick={signIn} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
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

      {authStatus.signedIn ? (
        <div className="mt-5 rounded-md border border-sky-100 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-ink">Signed in as {authStatus.email || authStatus.userId || "workspace user"}</p>
          <p className="mt-1 text-sm text-slate-700">Current security level: {authStatus.aal}. Use authenticator 2FA to reach aal2.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy || !configured} onClick={startTotpEnrollment} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
              <ShieldCheck size={17} aria-hidden="true" />
              Set up authenticator 2FA
            </button>
          </div>
        </div>
      ) : null}

      {totp ? (
        <div className="mt-5 rounded-md border border-teal-100 bg-teal-50 p-4">
          <p className="font-semibold text-ink">Scan this in Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app.</p>
          {totp.qrCode ? <img className="mt-3 h-44 w-44 rounded-md bg-white p-2" alt="Authenticator QR code" src={getQrCodeSource(totp.qrCode)} /> : null}
          {totp.secret ? <p className="mt-3 break-all text-sm text-slate-700">Manual code: <strong>{totp.secret}</strong></p> : null}
          {totp.uri ? <p className="mt-2 break-all text-xs text-slate-600">{totp.uri}</p> : null}
        </div>
      ) : null}

      {authStatus.signedIn ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Authenticator code" value={code} onChange={setCode} inputMode="numeric" autoComplete="one-time-code" />
          <button type="button" disabled={busy || !code.trim()} onClick={verifyTotpCode} className="self-end inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
            Verify 2FA
          </button>
        </div>
      ) : null}

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

function getQrCodeSource(qrCode: string) {
  if (qrCode.startsWith("data:")) return qrCode;
  if (qrCode.trim().startsWith("<svg")) return `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`;
  return qrCode;
}
