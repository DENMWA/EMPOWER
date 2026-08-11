"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, ClipboardList, CreditCard, LayoutDashboard, ReceiptText, Settings, UserRoundPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessAdmin, fullAdminRoles, type AdminPermission } from "@/lib/admin-permissions";
import { getStoredAccessToken } from "@/lib/supabase-rest";

const adminNavigation = [
  { label: "Today", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users, permission: "people" as AdminPermission },
  { label: "Staff", href: "/admin/team", icon: UserRoundPlus, matches: ["/admin/team", "/admin/staff"], permission: "team" as AdminPermission },
  { label: "Scheduling", href: "/admin/scheduling", icon: CalendarDays, permission: "scheduling" as AdminPermission },
  { label: "Shift review", href: "/admin/reviews", icon: ClipboardList, permission: "shift_verification" as AdminPermission },
  { label: "Incidents", href: "/admin/incidents", icon: AlertTriangle, permission: "incident_actioning" as AdminPermission },
  { label: "Invoicing", href: "/admin/billing", icon: ReceiptText, permission: "billing" as AdminPermission },
  { label: "Plan & billing", href: "/admin/plan-billing", icon: CreditCard, permission: "settings" as AdminPermission, fullAdminOnly: true },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, matches: ["/admin/reports", "/admin/progress", "/admin/audit-packs"], permission: "reports" as AdminPermission },
  { label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings" as AdminPermission }
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [access, setAccess] = useState<{ role: string; permissions: AdminPermission[] } | null>(null);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    fetch("/api/auth/access?mode=admin", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((result: { allowed?: boolean; role?: string; adminPermissions?: AdminPermission[] }) => {
        if (result.allowed && result.role) setAccess({ role: result.role, permissions: result.adminPermissions || [] });
      })
      .catch(() => setAccess(null));
  }, []);

  const visibleItems = access
    ? adminNavigation.filter((item) => (!item.permission || canAccessAdmin(access.role, access.permissions, item.permission)) && (!("fullAdminOnly" in item) || !item.fullAdminOnly || fullAdminRoles.has(access.role)))
    : adminNavigation.filter((item) => item.href === "/admin");

  return (
    <nav className="border-b border-slate-200 bg-slate-50/90" aria-label="Admin workspace navigation">
      <div className="premium-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {visibleItems.map((item) => {
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
