"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, ReceiptText, Settings, UserRoundPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavigation = [
  { label: "Today", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Staff", href: "/admin/team", icon: UserRoundPlus, matches: ["/admin/team", "/admin/staff"] },
  { label: "Scheduling", href: "/admin/scheduling", icon: CalendarDays },
  { label: "Records", href: "/admin/reviews", icon: ClipboardList, matches: ["/admin/reviews", "/admin/incidents", "/documents"] },
  { label: "Billing", href: "/admin/billing", icon: ReceiptText },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, matches: ["/admin/reports", "/admin/progress", "/admin/audit-packs"] },
  { label: "Settings", href: "/admin/settings", icon: Settings }
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-slate-50/90" aria-label="Admin workspace navigation">
      <div className="premium-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/admin"
            ? pathname === "/admin"
            : (item.matches || [item.href]).some((route) => pathname.startsWith(route));
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold",
                active ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white hover:text-ink"
              )}
            >
              <Icon size={17} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
