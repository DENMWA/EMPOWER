"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { Card, PageHeader, Section } from "@/components/ui";

const fallbackPassword = "EmpowerPlatform2026";
const storageKey = "empower-notes-platform-unlocked";

export function PlatformGate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUnlocked(window.localStorage.getItem(storageKey) === "true");
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expected = process.env.NEXT_PUBLIC_PLATFORM_DEMO_PASSWORD || fallbackPassword;

    if (password.trim() === expected) {
      window.localStorage.setItem(storageKey, "true");
      setUnlocked(true);
      setError("");
      return;
    }

    setError("Password did not match. Please try again.");
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Platform locked"
        title="Enter the platform owner password"
        description="This internal console is separate from provider admin and monitors subscriptions, payments, diagnostics, analytics, security, and platform health."
      />
      <Section>
        <Card className="mx-auto max-w-xl border-sky-200">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-md bg-sky-50 text-sky-800">
              <KeyRound size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">Developer platform access</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Enter your platform owner password to continue.</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Platform password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-11 rounded-md border border-slate-300 px-3"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift hover:bg-slate-800">
              Unlock platform
            </button>
          </form>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Demo password: {fallbackPassword}. Production should use owner-only authentication, MFA, IP controls, and server-side authorization.
          </p>
        </Card>
      </Section>
    </>
  );
}
