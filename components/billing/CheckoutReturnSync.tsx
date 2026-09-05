"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

// Stripe checkout's success_url points back here with ?subscription=active
// (see app/api/stripe/checkout/route.ts). Previously nothing on this page
// acted on that — the workspace only unlocked once the checkout.session.completed
// webhook arrived and was processed successfully. If the webhook was ever
// delayed, misconfigured, or failed for any reason, a customer who just paid
// would still see the trial-ended paywall with no indication anything was
// wrong.
//
// This calls the same refresh Stripe sync used by the "Already paid? Sync
// from Stripe" billing button, immediately and automatically, right when the
// customer lands back from a successful checkout — so activation no longer
// depends on the webhook succeeding at all for this critical first moment.
// The webhook remains the source of truth for ongoing renewals, plan
// changes, and cancellations; this only covers the initial post-checkout
// activation.
export function CheckoutReturnSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (searchParams.get("subscription") !== "active") return;
    attempted.current = true;

    void fetch("/api/subscription/refresh", {
      method: "POST",
      headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" }
    }).finally(() => {
      // Strip the query param either way so this doesn't re-trigger on
      // refresh or back navigation. If the refresh failed, the billing
      // page's "Already paid? Sync from Stripe" button remains available
      // as a manual fallback.
      router.replace("/dashboard");
    });
  }, [searchParams, router]);

  return null;
}
