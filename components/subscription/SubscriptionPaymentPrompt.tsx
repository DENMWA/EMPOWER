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
const checkoutRefreshKey = "empowernotes:checkout-subscription-refreshed";

export function SubscriptionPaymentPrompt({ signedIn, isPlatform }: { signedIn: boolean; isPlatform: boolean }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem(dismissedKey) === "true");
  }, []);

  useEffect(() => {
    if (!signedIn || isPlatform) {
      setStatus(null);
      return;
    }

    let mounted = true;
    async function refreshCheckoutStatus() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("subscription") !== "active" || window.sessionStorage.getItem(checkoutRefreshKey) === "true") return;
      window.sessionStorage.setItem(checkoutRefreshKey, "true");
      await fetch("/api/subscription/refresh", {
        method: "POST",
        headers: getAuthenticatedApiHeaders({ "Content-Type": "application/json" }),
        cache: "no-store"
      }).catch(() => undefined);
    }

    async function loadStatus() {
      try {
        await refreshCheckoutStatus();
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

  if (!signedIn || isPlatform || dismissed || !status?.paymentRequired || !status.canManageBilling) return null;

  function dismiss() {
    window.sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }

  async function refreshStatus() {
    setRefreshing(true);
    try {
      await fetch("/api/subscription/refresh", {
        method: "POST",
        headers: getAuthenticatedApiHeaders({ "Content-Type": "application/json" }),
        cache: "no-store"
      });
      const response = await fetch("/api/subscription/status", {
        headers: getAuthenticatedApiHeaders(),
        cache: "no-store"
      });
      const result = await response.json() as SubscriptionStatus;
      if (response.ok) setStatus(result);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8" aria-label="Payment required">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{status.message || "Payment is required to continue using EmpowerNotes."}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Your records remain in place. Continue to secure payment and keep the workspace active.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link href="/admin/plan-billing" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-900">
            <CreditCard size={16} aria-hidden="true" />
            Proceed to payment
          </Link>
          <button type="button" onClick={refreshStatus} disabled={refreshing} className="inline-flex min-h-10 items-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60">
            {refreshing ? "Refreshing..." : "Refresh status"}
          </button>
          <button type="button" onClick={dismiss} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:border-slate-400" aria-label="Dismiss payment notice for this session">
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
