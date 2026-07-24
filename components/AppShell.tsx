"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccessibilityToggle } from "@/components/accessibility/AccessibilityToggle";
import { DemoAccessBoundary } from "@/components/auth/DemoAccessBoundary";
import { authSessionChangedEvent, getCurrentAuthStatus } from "@/lib/supabase-auth";
import { getDemoOrganisationAccess, isAccessBlocked } from "@/lib/platform-access";
import { setDataMode } from "@/lib/presentation-mode";
import { accessChangedEvent, canAccessAdmin, getCurrentAppUser, getDefaultAppUser } from "@/lib/user-access";
import { complianceDisclaimer, cn } from "@/lib/utils";
import { AlertTriangle, LayoutDashboard, Mic, ShieldCheck, Users, FolderLock, SlidersHorizontal, SquareTerminal, KeyRound, ChevronRight, Sparkles } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Admin", icon: SlidersHorizontal },
  { href: "/notes/new", label: "Progress Note", icon: Mic },
  { href: "/participants", label: "My Clients", icon: Users },
  { href: "/incidents", label: "Incidents", icon: ShieldCheck },
  { href: "/documents", label: "Documents", icon: FolderLock },
  { href: "/signin", label: "Sign in", icon: KeyRound },
  { href: "/signup", label: "Sign up", icon: Sparkles }
];

const publicNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, disabled: true },
  { href: "/notes/new", label: "Progress Note", icon: Mic, disabled: true },
  { href: "/participants", label: "My Clients", icon: Users, disabled: true },
  { href: "/incidents", label: "Incidents", icon: ShieldCheck, disabled: true },
  { href: "/documents", label: "Documents", icon: FolderLock, disabled: true },
  { href: "/signin", label: "Sign in", icon: KeyRound },
  { href: "/signup", label: "Sign up", icon: Sparkles }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [organisationAccess, setOrganisationAccess] = useState<ReturnType<typeof getDemoOrganisationAccess> | null>(null);
  const [currentUser, setCurrentUser] = useState(getDefaultAppUser);
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = usePathname();
  const isPlatform = pathname.startsWith("/platform");
  const visibleNavItems = signedIn
    ? navItems.filter((item) => item.href !== "/signin" && item.href !== "/signup" && (item.href !== "/admin" || canAccessAdmin(currentUser.role)))
    : publicNavItems;

  useEffect(() => {
    const saved = window.localStorage.getItem("empower-accessibility-mode");
    setAccessibilityMode(saved === "true");
    setOrganisationAccess(getDemoOrganisationAccess());
    setCurrentUser(getCurrentAppUser());
    const authStatus = getCurrentAuthStatus();
    setSignedIn(authStatus.signedIn);
    setAuthChecked(true);
    if (!authStatus.signedIn) setDataMode("demo");
  }, []);

  useEffect(() => {
    function syncAuth() {
      const authStatus = getCurrentAuthStatus();
      setSignedIn(authStatus.signedIn);
      setAuthChecked(true);
      if (!authStatus.signedIn) setDataMode("demo");
    }

    window.addEventListener(authSessionChangedEvent, syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(authSessionChangedEvent, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    function syncAccess() {
      setCurrentUser(getCurrentAppUser());
    }

    window.addEventListener(accessChangedEvent, syncAccess);
    window.addEventListener("storage", syncAccess);
    return () => {
      window.removeEventListener(accessChangedEvent, syncAccess);
      window.removeEventListener("storage", syncAccess);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("empower-accessibility-mode", String(accessibilityMode));
  }, [accessibilityMode]);

  return (
    <div className={cn("min-h-screen", isPlatform ? "bg-slate-100" : "bg-mist", accessibilityMode && "accessibility-mode")}>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-ink" aria-label="Open EmpowerNotes dashboard">
            <span className={cn("grid h-10 w-10 place-items-center rounded-lg text-base font-bold text-white shadow-sm", isPlatform ? "bg-slate-950" : "bg-sea")}>
              {isPlatform ? <SquareTerminal size={19} aria-hidden="true" /> : "E"}
            </span>
            <span>
              <span className="block text-[17px] leading-5">{isPlatform ? "EmpowerNotes Platform" : "EmpowerNotes"}</span>
              <span className="block text-xs font-normal text-slate-500">{isPlatform ? "Owner console" : "Support records, made clear"}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {isPlatform ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">Internal platform</span> : null}
            {!signedIn && !isPlatform ? <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-100">Product preview</span> : null}
            <AccessibilityToggle enabled={accessibilityMode} onChange={setAccessibilityMode} />
          </div>
        </div>
        {isPlatform ? (
          <nav className="premium-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8" aria-label="Platform navigation">
            {[
              ["Overview", "overview"],
              ["Organisations", "organisations"],
              ["Subscriptions", "subscriptions"],
              ["Payments", "payments"],
              ["Diagnostics", "diagnostics"],
              ["Analytics", "analytics"],
              ["Security", "security"],
              ["Support", "support"],
              ["Trial Run", "trial"]
            ].map(([label, hash]) => (
              <Link key={hash} href={`/platform#${hash}`} className="inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="premium-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8" aria-label="Primary navigation">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              if ("disabled" in item && item.disabled) {
                return (
                  <span
                    key={item.href}
                    aria-disabled="true"
                    title="Available after sign up"
                    className="inline-flex min-h-10 shrink-0 cursor-default items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-400"
                  >
                    <Icon aria-hidden="true" size={18} />
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-slate-100 focus:bg-slate-100",
                    item.href === "/signup"
                      ? "rounded-sm border border-teal-700 bg-white text-teal-800 shadow-sm hover:bg-teal-50"
                      : active
                        ? "bg-teal-50 text-teal-800"
                        : "text-slate-600"
                  )}
                >
                  <Icon aria-hidden="true" size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main>
        <DemoAccessBoundary pathname={pathname} signedIn={signedIn} authChecked={authChecked}>
          {!isPlatform && organisationAccess && isAccessBlocked(organisationAccess.status) ? (
            <section className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-md border border-red-200 bg-white p-6 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-md bg-red-50 text-red-700">
                    <AlertTriangle size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Access paused</p>
                    <h1 className="mt-1 text-2xl font-bold text-ink">This organisation is currently {organisationAccess.status.toLowerCase()}.</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Access has been paused by the EmpowerNotes platform console. Contact the platform owner or billing contact to reactivate this account.
                    </p>
                    {organisationAccess.override?.reason ? (
                      <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Reason: {organisationAccess.override.reason}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : children}
        </DemoAccessBoundary>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-sm leading-6 text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="max-w-4xl">{complianceDisclaimer}</p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Legal and support">
            <Link href="/legal/privacy" className="font-semibold text-slate-600 hover:text-teal-800">Privacy</Link>
            <Link href="/legal/terms" className="font-semibold text-slate-600 hover:text-teal-800">Terms</Link>
            <Link href="/legal" className="font-semibold text-slate-600 hover:text-teal-800">Policy centre</Link>
            <Link href="/contact" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900">
              Support <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
