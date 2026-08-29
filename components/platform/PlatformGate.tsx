"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { Card, PageHeader, Section } from "@/components/ui";
import { authSessionChangedEvent } from "@/lib/supabase-auth";
import { getStoredAccessToken } from "@/lib/supabase-rest";

type AccessState = "checking" | "allowed" | "denied";

export function PlatformGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>("checking");
  const [message, setMessage] = useState("Checking platform owner access...");

  useEffect(() => {
    async function verifyAccess() {
      const token = getStoredAccessToken();
      if (!token) {
        setState("denied");
        setMessage("Sign in with the designated platform owner account to continue.");
        return;
      }

      try {
        const response = await fetch("/api/auth/access?mode=platform", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        const result = await response.json() as { allowed?: boolean; reason?: string };
        setState(result.allowed ? "allowed" : "denied");
        setMessage(result.reason || "Platform owner access is required.");
      } catch {
        setState("denied");
        setMessage("Platform access could not be verified. Check your connection and try again.");
      }
    }

    void verifyAccess();
    window.addEventListener(authSessionChangedEvent, verifyAccess);
    return () => window.removeEventListener(authSessionChangedEvent, verifyAccess);
  }, []);

  if (state === "allowed") return <>{children}</>;
  if (state === "checking") return <div className="min-h-[55vh] bg-slate-100" aria-label="Checking platform owner access" />;

  return (
    <>
      <PageHeader eyebrow="Internal platform" title="Platform owner access required" description="Subscriptions, payments, diagnostics, analytics, and platform controls are restricted to the designated EmpowerNotes owner." />
      <Section>
        <Card className="mx-auto max-w-xl border-sky-200 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-sky-50 text-sky-800">
            <KeyRound size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink">Verified owner account required</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          <Link href="/platform/signin?next=/platform" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift hover:bg-slate-800">
            Send email sign-in link
          </Link>
        </Card>
      </Section>
    </>
  );
}
