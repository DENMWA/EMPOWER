"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccessibilityToggle } from "@/components/accessibility/AccessibilityToggle";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { complianceDisclaimer, cn } from "@/lib/utils";
import { LayoutDashboard, Mic, ShieldCheck, Users, FolderLock, ClipboardCheck, BadgeDollarSign, SlidersHorizontal, SquareTerminal } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Admin", icon: SlidersHorizontal },
  { href: "/notes/new", label: "Progress Note", icon: Mic },
  { href: "/participants", label: "Participants", icon: Users },
  { href: "/incidents", label: "Incidents", icon: ShieldCheck },
  { href: "/documents", label: "Documents", icon: FolderLock },
  { href: "/audit-packs", label: "Audit Packs", icon: ClipboardCheck },
  { href: "/pricing", label: "Pricing", icon: BadgeDollarSign }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const pathname = usePathname();
  const isPlatform = pathname.startsWith("/platform");

  useEffect(() => {
    const saved = window.localStorage.getItem("empower-accessibility-mode");
    setAccessibilityMode(saved === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("empower-accessibility-mode", String(accessibilityMode));
  }, [accessibilityMode]);

  return (
    <div className={cn("min-h-screen", isPlatform ? "bg-slate-100" : "bg-mist", accessibilityMode && "accessibility-mode")}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className={cn("h-1", isPlatform ? "bg-gradient-to-r from-slate-950 via-sky-700 to-teal-600" : "bg-gradient-to-r from-teal-700 via-sky-600 to-amber-500")} />
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href={isPlatform ? "/platform" : "/"} className="flex items-center gap-3 font-semibold text-ink" aria-label={isPlatform ? "EmpowerNotes platform console" : "EmpowerNotes home"}>
            <span className={cn("grid h-12 w-12 place-items-center rounded-md text-lg font-bold text-white shadow-lift ring-4", isPlatform ? "bg-slate-950 ring-slate-100" : "bg-ink ring-teal-50")}>
              {isPlatform ? <SquareTerminal size={22} aria-hidden="true" /> : "E"}
            </span>
            <span>
              <span className="block text-lg">{isPlatform ? "EmpowerNotes Platform" : "EmpowerNotes"}</span>
              <span className="block text-sm font-normal text-slate-600">{isPlatform ? "Owner-only subscription and diagnostics console" : "Clear, person-centred support records"}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {isPlatform ? <span className="rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">Internal platform</span> : <PlanBadge role="owner" />}
            <AccessibilityToggle enabled={accessibilityMode} onChange={setAccessibilityMode} />
          </div>
        </div>
        {isPlatform ? (
          <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Platform navigation">
            {["Overview", "Organisations", "Subscriptions", "Payments", "Diagnostics", "Analytics", "Security", "Support"].map((item) => (
              <span key={item} className="inline-flex min-h-11 items-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-700">
                {item}
              </span>
            ))}
          </nav>
        ) : (
          <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition hover:bg-skySoft focus:bg-skySoft",
                    active ? "bg-skySoft text-teal-900 shadow-sm" : "text-slate-700"
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
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 text-sm leading-6 text-slate-600">
          <p>{complianceDisclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
