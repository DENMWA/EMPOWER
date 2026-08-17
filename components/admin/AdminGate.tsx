"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Card, PageHeader, Section } from "@/components/ui";
import { authSessionChangedEvent } from "@/lib/supabase-auth";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import type { AdminPermission } from "@/lib/admin-permissions";

type AccessState = "checking" | "allowed" | "denied";

export function AdminGate({ children, permission }: { children: ReactNode; permission?: AdminPermission }) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>("checking");
  const [message, setMessage] = useState("Checking your workspace role...");

  useEffect(() => {
    async function verifyAccess() {
      const token = getStoredAccessToken();
      if (!token) {
        setState("denied");
        setMessage("Sign in with an administrator account to continue.");
        return;
      }

      try {
        const query = permission ? `&permission=${encodeURIComponent(permission)}` : "";
        const response = await fetch(`/api/auth/access?mode=admin${query}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        const result = await response.json() as { allowed?: boolean; reason?: string; requiresMfa?: boolean };
        if (!result.allowed) {
          if (result.requiresMfa) {
            router.replace(`/mfa?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }
          setState("checking");
          router.replace("/dashboard");
          return;
        }
        setState("allowed");
        setMessage(result.reason || "Administrator access is required.");
      } catch {
        setState("denied");
        setMessage("Administrator access could not be verified. Check your connection and try again.");
      }
    }

    void verifyAccess();
    window.addEventListener(authSessionChangedEvent, verifyAccess);
    return () => window.removeEventListener(authSessionChangedEvent, verifyAccess);
  }, [permission, router]);

  if (state === "allowed") return <>{children}</>;
  if (state === "checking") return <div className="min-h-[55vh] bg-mist" aria-label="Checking administrator access" />;

  return <AccessRequired title="Administrator access required" message={message} />;
}

function AccessRequired({ title, message }: { title: string; message: string }) {
  return (
    <>
      <PageHeader eyebrow="Private workspace" title={title} description="Rostering, people, billing, reports, and organisation controls are restricted by your verified workspace role." />
      <Section>
        <Card className="mx-auto max-w-xl border-teal-200 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-mint text-teal-900">
            <LockKeyhole size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          <Link href="/signin?next=/admin" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
            Sign in securely
          </Link>
        </Card>
      </Section>
    </>
  );
}
