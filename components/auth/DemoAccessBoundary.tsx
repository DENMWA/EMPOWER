"use client";

import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

const publicPages = new Set(["/", "/pricing", "/contact", "/signup", "/signin"]);
const demoPages = new Set(["/dashboard", "/notes/new", "/incidents", "/incidents/new"]);

export function DemoAccessBoundary({
  children,
  pathname,
  signedIn,
  authChecked
}: {
  children: React.ReactNode;
  pathname: string;
  signedIn: boolean;
  authChecked: boolean;
}) {
  if (!authChecked && !publicPages.has(pathname)) {
    return <div className="min-h-[55vh] bg-mist" aria-label="Checking workspace access" />;
  }

  if (signedIn || publicPages.has(pathname) || demoPages.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <section className="mx-auto flex min-h-[58vh] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-7 text-center shadow-soft">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-800">
          <LockKeyhole size={22} aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Private workspace feature</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Create a workspace to continue</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This area can contain client, staff, operational or business records and is not included in the public demo.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
          <ShieldCheck size={17} className="text-teal-700" aria-hidden="true" />
          Private by design
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/signup?next=${encodeURIComponent(pathname)}`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
            Start free trial
          </Link>
          <Link href={`/signin?next=${encodeURIComponent(pathname)}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-slate-400">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
