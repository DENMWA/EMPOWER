"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { getCurrentAuthStatus, signUpWithPassword } from "@/lib/supabase-auth";
import { completePendingOnboarding, savePendingOnboarding } from "@/lib/pending-onboarding";
import { setDataMode } from "@/lib/presentation-mode";
import { setCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { selfServicePlans } from "@/lib/pricing-data";
import { trackMarketingEvent } from "@/lib/marketing/client";

const planOptions = selfServicePlans.map(({ tier, price }) => ({ tier, price }));

export function SimpleSignupForm() {
  const [organisationName, setOrganisationName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [providerType, setProviderType] = useState<"organisation" | "sole_provider">("organisation");
  const [tier, setTier] = useState<SubscriptionTier>("practice");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const requestedPlan = new URLSearchParams(window.location.search).get("plan");
    if (planOptions.some((plan) => plan.tier === requestedPlan)) {
      setTier(requestedPlan as SubscriptionTier);
      if (requestedPlan === "solo") setProviderType("sole_provider");
    }
  }, []);

  async function createWorkspace() {
    const cleanOrganisation = organisationName.trim();
    const cleanOwner = ownerName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanOrganisation || !cleanOwner || !cleanEmail || !password) {
      setMessage("Complete each field to create your workspace.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (!accepted) {
      setMessage("Accept the Terms and Privacy Policy to continue.");
      return;
    }

    setBusy(true);
    setMessage("");
    void trackMarketingEvent("signup_started", { plan: tier, providerType });
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    savePendingOnboarding({
      organisationName: cleanOrganisation,
      ownerName: cleanOwner,
      ownerEmail: cleanEmail,
      providerType,
      subscriptionTier: tier,
      trialEndsAt
    });
    setCurrentSubscriptionTier(tier);
    window.localStorage.setItem("empowernotes:trial", JSON.stringify({
      tier,
      status: "trialing",
      trialDays: 14,
      startedAt: new Date().toISOString(),
      endsAt: trialEndsAt
    }));

    try {
      const signup = await signUpWithPassword(cleanEmail, password);
      if (signup.error) {
        setMessage(signup.error);
        return;
      }

      if (getCurrentAuthStatus().signedIn) {
        const setup = await completePendingOnboarding();
        if (setup.error) {
          setMessage(setup.error);
          return;
        }
        setSuccess(true);
        setMessage("Your workspace is ready.");
        setDataMode("real");
        window.setTimeout(() => window.location.assign(getSafeNextPath(providerType)), 500);
        return;
      }

      setSuccess(true);
      setMessage("Check your email to confirm your account. Your workspace setup will continue when you sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-3xl border-teal-100 p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">14 days free</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Create your workspace</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">No card required. You can change plans before billing begins.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Business name" value={organisationName} onChange={setOrganisationName} autoComplete="organization" />
        <Field label="Your full name" value={ownerName} onChange={setOwnerName} autoComplete="name" />
        <Field label="Work email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="new-password" />
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Provider type
          <select value={providerType} onChange={(event) => setProviderType(event.target.value as "organisation" | "sole_provider")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm">
            <option value="organisation">Organisation / team</option>
            <option value="sole_provider">Sole provider</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Starting plan
          <select value={tier} onChange={(event) => {
            const nextTier = event.target.value as SubscriptionTier;
            setTier(nextTier);
            if (nextTier === "solo") setProviderType("sole_provider");
          }} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm">
            {planOptions.map((plan) => <option key={plan.tier} value={plan.tier}>{subscriptionTiers[plan.tier].shortName} - {plan.price}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-600">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
        <span>I agree to the <Link href="/legal/terms" className="font-semibold text-teal-700">Terms of Service</Link> and acknowledge the <Link href="/legal/privacy" className="font-semibold text-teal-700">Privacy Policy</Link>.</span>
      </label>

      <button type="button" disabled={busy} onClick={createWorkspace} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-sea px-5 text-sm font-semibold text-white shadow-lift hover:bg-teal-800 disabled:cursor-wait disabled:bg-slate-400 sm:w-auto">
        {success ? <CheckCircle2 size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
        {busy ? "Creating workspace..." : "Start free trial"}
      </button>

      {message ? <p className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${success ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{message}</p> : null}
      <p className="mt-5 text-sm text-slate-600">Already have an account? <Link href="/signin" className="font-semibold text-teal-700 hover:text-teal-900">Sign in</Link></p>
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm" />
    </label>
  );
}

function getSafeNextPath(providerType: "organisation" | "sole_provider") {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : providerType === "sole_provider" ? "/admin" : "/dashboard";
}
