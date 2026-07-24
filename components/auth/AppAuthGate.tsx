"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import {
  authSessionChangedEvent,
  getCurrentAuthStatus
} from "@/lib/supabase-auth";

const publicRoutes = new Set(["/", "/pricing", "/contact", "/signin", "/signup"]);

export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = publicRoutes.has(pathname);
  const [checked, setChecked] = useState(isPublicRoute);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    function checkSession() {
      const status = getCurrentAuthStatus();
      setSignedIn(status.signedIn);
      setChecked(true);

      if (!isPublicRoute && !status.signedIn) {
        const next = encodeURIComponent(pathname);
        router.replace(`/signin?next=${next}`);
      }
    }

    checkSession();
    window.addEventListener(authSessionChangedEvent, checkSession);
    window.addEventListener("storage", checkSession);
    return () => {
      window.removeEventListener(authSessionChangedEvent, checkSession);
      window.removeEventListener("storage", checkSession);
    };
  }, [isPublicRoute, pathname, router]);

  if (isPublicRoute) return <>{children}</>;

  if (!checked || !signedIn) {
    return (
      <section className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-800">
            <LockKeyhole size={22} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink">Sign in required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in to open your secure EmpowerNotes workspace.
          </p>
          <Link href={`/signin?next=${encodeURIComponent(pathname)}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
            Continue to sign in
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
