"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

type FeatureCategory = "operations" | "billing" | "intelligence";

export function ServerFeatureGate({
  category,
  feature,
  title,
  children
}: {
  category: FeatureCategory;
  feature: string;
  title: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<"loading" | "allowed" | "denied" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      try {
        const response = await fetch(`/api/subscription/entitlement?category=${encodeURIComponent(category)}&feature=${encodeURIComponent(feature)}`, {
          headers: getAuthenticatedApiHeaders(),
          cache: "no-store"
        });
        const result = await response.json() as { allowed?: boolean };
        if (active) setState(response.ok && result.allowed ? "allowed" : response.ok ? "denied" : "error");
      } catch {
        if (active) setState("error");
      }
    }

    void checkAccess();
    return () => { active = false; };
  }, [category, feature]);

  if (state === "allowed") return <>{children}</>;
  if (state === "loading") return <div className="mx-auto max-w-3xl px-4 py-16 text-sm font-semibold text-slate-600">Checking plan access...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <UpgradePrompt
        title={state === "error" ? "Plan access unavailable" : title}
        message={state === "error"
          ? "EmpowerNotes could not securely verify this capability. Refresh the page or sign in again."
          : "This capability is not included in the organisation's current plan. Existing records remain available for viewing and export."}
      />
    </div>
  );
}
