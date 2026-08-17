"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAuthStatus } from "@/lib/supabase-auth";

export function SettingsSecurityGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const auth = getCurrentAuthStatus();
    if (auth.aal === "aal2") setVerified(true);
    else router.replace(`/mfa?next=${encodeURIComponent("/admin/settings")}`);
  }, [router]);

  return verified ? <>{children}</> : <div className="min-h-[55vh] bg-mist" aria-label="Checking secure verification" />;
}
