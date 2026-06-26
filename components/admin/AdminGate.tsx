"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Card, PageHeader, Section } from "@/components/ui";

const fallbackPassword = "EmpowerNotes2026";
const storageKey = "empower-notes-admin-unlocked";

export function AdminGate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUnlocked(window.localStorage.getItem(storageKey) === "true");
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_DEMO_PASSWORD || fallbackPassword;

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
        eyebrow="Admin locked"
        title="Enter the admin password"
        description="This area controls rostering, team access, reviews, reports, documents, audit packs, and organisation settings."
      />
      <Section>
        <Card className="mx-auto max-w-xl border-teal-200">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-md bg-mint text-teal-900">
              <LockKeyhole size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">Admin access required</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Enter the admin password to continue.</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Admin password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-11 rounded-md border border-slate-300 px-3"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
              Unlock admin
            </button>
          </form>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Demo password: {fallbackPassword}. In production this should be replaced with real user login, roles, and server-side access control.
          </p>
        </Card>
      </Section>
    </>
  );
}
