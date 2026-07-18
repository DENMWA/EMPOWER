"use client";

import type { ReactNode } from "react";
import { useEntitlement } from "@/hooks/useEntitlement";
import type { PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

export function FeatureGate({ entitlement, children, fallback }: { entitlement: PlanToProgressEntitlementKey; children: ReactNode; fallback?: ReactNode }) {
  const { allowed } = useEntitlement(entitlement);

  if (allowed) return <>{children}</>;

  return (
    <>
      {fallback ?? (
        <UpgradePrompt
          title="Advanced plan-to-progress intelligence"
          message="This capability is available on a higher EmpowerNotes plan. Existing records remain visible and exportable."
        />
      )}
    </>
  );
}
