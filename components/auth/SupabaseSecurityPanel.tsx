"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import {
  authSessionChangedEvent,
  challengeMfaFactor,
  enrollTotpFactor,
  getCurrentAuthStatus,
  getDefaultAuthStatus,
  listMfaFactors,
  sendEmailOtp,
  sendPhoneOtp,
  signInWithPassword,
  signOutSupabaseSession,
  signUpWithPassword,
  verifyEmailOtp,
  verifyPhoneOtp,
  verifyMfaFactor
} from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

type EnrolledTotp = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

export function SupabaseSecurityPanel() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpChannel, setOtpChannel] = useState<"email" | "phone">("email");
  const [authStatus, setAuthStatus] = useState(getDefaultAuthStatus);
  const [totp, setTotp] = useState<EnrolledTotp | null>(null);
  const [factorId, setFactorId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();
  const mfaReady = authStatus.aal === "aal2";

  useEffect(() => {
    function syncAuthStatus() {
      setAuthStatus(getCurrentAuthStatus());
    }

    syncAuthStatus();
    window.addEventListener(authSessionChangedEvent, syncAuthStatus);
    return () => window.removeEventListener(authSessionChangedEvent, syncAuthStatus);
  }, []);

  async function createAccount() {
    await withBusy(async () => {
      const result = await signUpWithPassword(email.trim(), password);
      setMessage(result.error
        ? result.error
        : "Account created. If email confirmation is enabled in Supabase, confirm your email, then sign in.");
    });
  }

  async function signIn() {
    await withBusy(async () => {
      const result = await signInWithPassword(email.trim(), password);
      if (result.error) {
        setMessage(result.error);
        return;
      }

      setMessage("Signed in. Cloud saves are now available for this Supabase user.");
      await loadVerifiedMfaFactor();
    });
  }

  async function requestOtp() {
    await withBusy(async () => {
      const result = otpChannel === "email"
        ? await sendEmailOtp(email.trim())
        : await sendPhoneOtp(phone.trim());

      if (result.error) {
        setMessage(result.error);
        return;
      }

      setMessage(otpChannel === "email"
        ? "Email code sent. Enter the code from your inbox to sign in."
        : "SMS code sent. Enter the code from your phone to sign in. Phone OTP requires SMS auth to be enabled in Supabase.");
    });
  }

  async function verifyOtp() {
    await withBusy(async () => {
      const result = otpChannel === "email"
        ? await verifyEmailOtp(email.trim(), otpCode.trim())
        : await verifyPhoneOtp(phone.trim(), otpCode.trim());

      if (result.error) {
        setMessage(result.error);
        return;
      }

      setOtpCode("");
      setMessage("Code verified. Cloud saves are now available for this Supabase user.");
      await loadVerifiedMfaFactor();
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
      setMessage("2FA verified. This session is now upgraded for safer Supabase access.");
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

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Supabase Auth and 2FA</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Secure cloud saving</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Sign in before creating or saving records so clients, staff, documents, notes, reports, and billing records save to Supabase instead of browser-only storage.
          </p>
        </div>
        <StatusBadge label={!configured ? "Supabase not configured" : mfaReady ? "2FA verified" : authStatus.signedIn ? "Signed in" : "Sign in required"} tone={!configured ? "red" : mfaReady ? "green" : authStatus.signedIn ? "blue" : "amber"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy || !configured} onClick={signIn} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
          <KeyRound size={17} aria-hidden="true" />
          Sign in
        </button>
        <button type="button" disabled={busy || !configured} onClick={createAccount} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100">
          Create auth user
        </button>
        {authStatus.signedIn ? (
          <button type="button" disabled={busy} onClick={() => { signOutSupabaseSession(); setMessage("Signed out from this browser."); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:border-red-400">
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        ) : null}
      </div>

      <div className="mt-6 rounded-md border border-sky-100 bg-sky-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Sign in with a one-time code</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">Use email code by default. Phone/SMS works once SMS auth is enabled in Supabase.</p>
          </div>
          <div className="flex rounded-md border border-slate-300 bg-white p-1">
            <button type="button" onClick={() => setOtpChannel("email")} className={otpChannel === "email" ? "rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" : "rounded-md px-3 py-2 text-sm font-semibold text-slate-700"}>
              Email
            </button>
            <button type="button" onClick={() => setOtpChannel("phone")} className={otpChannel === "phone" ? "rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" : "rounded-md px-3 py-2 text-sm font-semibold text-slate-700"}>
              Phone
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_auto_auto]">
          {otpChannel === "email" ? (
            <Field label="Email for code" value={email} onChange={setEmail} type="email" autoComplete="email" />
          ) : (
            <Field label="Phone for SMS code" value={phone} onChange={setPhone} type="tel" autoComplete="tel" placeholder="+614..." />
          )}
          <Field label="Code" value={otpCode} onChange={setOtpCode} inputMode="numeric" autoComplete="one-time-code" />
          <button type="button" disabled={busy || !configured || (otpChannel === "email" ? !email.trim() : !phone.trim())} onClick={requestOtp} className="self-end inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100">
            Send code
          </button>
          <button type="button" disabled={busy || !configured || !otpCode.trim()} onClick={verifyOtp} className="self-end inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
            Verify code
          </button>
        </div>
      </div>

      {authStatus.signedIn ? (
        <div className="mt-5 rounded-md border border-sky-100 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-ink">Signed in as {authStatus.email || authStatus.userId || "Supabase user"}</p>
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
