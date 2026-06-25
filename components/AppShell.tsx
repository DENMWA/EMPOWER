"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccessibilityToggle } from "@/components/accessibility/AccessibilityToggle";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { complianceDisclaimer, cn } from "@/lib/utils";
import { LayoutDashboard, Mic, FileText, ShieldCheck, Users, FolderLock, ClipboardCheck, BadgeDollarSign } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes/new", label: "Progress Note", icon: Mic },
  { href: "/participants", label: "Participants", icon: Users },
  { href: "/incidents", label: "Incidents", icon: ShieldCheck },
  { href: "/documents", label: "Documents", icon: FolderLock },
  { href: "/audit-packs", label: "Audit Packs", icon: ClipboardCheck },
  { href: "/pricing", label: "Pricing", icon: BadgeDollarSign }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("empower-accessibility-mode");
    setAccessibilityMode(saved === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("empower-accessibility-mode", String(accessibilityMode));
  }, [accessibilityMode]);

  return (
    <div className={cn("min-h-screen bg-mist", accessibilityMode && "accessibility-mode")}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3 font-semibold text-ink" aria-label="Empower home">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-sea text-lg font-bold text-white">E</span>
            <span>
              <span className="block text-lg">Empower Disability and Social Work</span>
              <span className="block text-sm font-normal text-slate-600">Voice-to-compliant-documentation</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <PlanBadge role="owner" />
            <AccessibilityToggle enabled={accessibilityMode} onChange={setAccessibilityMode} />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-skySoft focus:bg-skySoft">
                <Icon aria-hidden="true" size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600">
          <p>{complianceDisclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
