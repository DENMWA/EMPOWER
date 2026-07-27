"use client";

import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";
import type { SubscriptionUsageResponse } from "@/lib/subscriptions/usage-types";

export async function getLiveSubscriptionUsage() {
  const response = await fetch("/api/subscription/usage", {
    method: "GET",
    headers: getAuthenticatedApiHeaders(),
    cache: "no-store"
  });
  const data = await response.json() as SubscriptionUsageResponse & { error?: string };

  if (!response.ok) {
    return { data: null, error: data.error || "Live subscription usage is unavailable." };
  }

  return { data, error: "" };
}

