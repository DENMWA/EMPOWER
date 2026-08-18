"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { enrollTotpMfa, getCurrentAuthStatus, getMfaFactors, removeMfaFactor, verifyTotpMfa } from "@/lib/supabase-auth";

type Enrollment = { qrCode: string; secret: string; uri: string };

export function MfaSecurityPanel() {
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const auth = getCurrentAuthStatus();
    if (!auth.signedIn) {
      window.location.replace(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (auth.aal === "aal2") {
      continueAfterVerification();
      return;
    }
    void getMfaFactors().then(async (result) => {
      if (result.error) {
        setMessage(result.error);
        setBusy(false);
        return;
      }
      const totpFactors = result.factors.filter((factor) => factor.factor_type === "totp");
      const verified = totpFactors.find((factor) => factor.status === "verified");
      if (verified) setFactorId(verified.id);
      else {
        await Promise.all(totpFactors.map((factor) => removeMfaFactor(factor.id)));
        await createEnrollment();
      }
      setBusy(false);
    });
  }, []);

  async function createEnrollment() {
    setBusy(true);
    const result = await enrollTotpMfa();
    if (result.error || !result.data) setMessage(result.error || "Authenticator setup could not be started.");
    else {
      setFactorId(result.data.id);
      setEnrollment({ qrCode: normaliseQrCode(result.data.totp.qr_code), secret: result.data.totp.secret, uri: result.data.totp.uri });
    }
    setBusy(false);
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    const result = await verifyTotpMfa(factorId, code);
    if (result.error) setMessage(result.error);
    else continueAfterVerification();
    setBusy(false);
  }

  function continueAfterVerification() {
    const requested = new URLSearchParams(window.location.search).get("next") || "/admin";
    window.location.replace(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/admin");
  }

  return (
    <Card className="mx-auto max-w-lg border-teal-200 shadow-lift">
      <span className="grid h-12 w-12 place-items-center rounded-md bg-mint text-teal-900"><ShieldCheck size={22} aria-hidden="true" /></span>
      <h2 className="mt-4 text-xl font-bold text-ink">Verify privileged access</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Use your authenticator app to protect organisation controls.</p>
      {enrollment ? <div className="mt-5 grid justify-items-center gap-3 rounded-md border border-slate-200 p-4 text-center"><div className="grid min-h-48 min-w-48 place-items-center bg-white"><Image src={enrollment.qrCode} alt="Authenticator setup QR code" width={192} height={192} unoptimized priority /></div><a href={enrollment.uri} className="text-sm font-semibold text-teal-700 underline underline-offset-4">Open authenticator app</a><p className="text-xs text-slate-600">Cannot scan? Enter this setup key:</p><code className="break-all text-sm font-semibold text-ink">{enrollment.secret}</code></div> : null}
      <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">Six-digit code<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-center text-lg text-ink shadow-sm" /></label>
      <button type="button" onClick={verify} disabled={busy || !factorId} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800 disabled:bg-slate-400">{busy ? "Checking..." : enrollment ? "Enable and continue" : "Verify and continue"}</button>
      {message ? <p aria-live="polite" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
    </Card>
  );
}

function normaliseQrCode(value: string) {
  const qrCode = value.trim();
  if (qrCode.startsWith("data:image/")) return qrCode;
  if (qrCode.startsWith("<svg")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`;
  if (/^[A-Za-z0-9+/=]+$/.test(qrCode)) return `data:image/svg+xml;base64,${qrCode}`;
  return qrCode;
}
