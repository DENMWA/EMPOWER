"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { authSessionChangedEvent, getAuthenticatedApiHeaders } from "@/lib/supabase-auth";
import { cn } from "@/lib/utils";

type SubscriptionStatus = {
  status: string;
  paymentRequired: boolean;
  canManageBilling: boolean;
  message: string;
};

const dismissedKey = "empowernotes:payment-prompt-dismissed";

export function SubscriptionPaymentPrompt({ signedIn, isPlatform }: { signedIn: boolean; isPlatform: boolean }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem(dismissedKey) === "true");
  }, []);

  useEffect(() => {
    if (!signedIn || isPlatform) {
      setStatus(null);
      return;
    }

    let mounted = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/subscription/status", {
          headers: getAuthenticatedApiHeaders(),
          cache: "no-store"
        });
        const result = await response.json() as SubscriptionStatus;
        if (mounted && response.ok) setStatus(result);
      } catch {
        if (mounted) setStatus(null);
      }
    }

    void loadStatus();
    window.addEventListener(authSessionChangedEvent, loadStatus);
    return () => {
      mounted = false;
      window.removeEventListener(authSessionChangedEvent, loadStatus);
    };
  }, [signedIn, isPlatform]);

  if (!signedIn || isPlatform || dismissed || !status?.paymentRequired) return null;

  function dismiss() {
    window.sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }

  return (
    <section className={cn("border-b px-4 py-3 sm:px-6 lg:px-8", status.canManageBilling ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50")} aria-label="Payment required">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{status.message || "Payment is required to continue using EmpowerNotes."}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {status.canManageBilling ? "Your records remain in place. Continue to secure payment and keep the workspace active." : "Your organisation admin can update payment from Plan & billing."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {status.canManageBilling ? (
            <Link href="/admin/plan-billing" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-900">
              <CreditCard size={16} aria-hidden="true" />
              Proceed to payment
            </Link>
          ) : null}
          <button type="button" onClick={dismiss} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:border-slate-400" aria-label="Dismiss payment notice for this session">
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

