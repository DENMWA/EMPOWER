"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { adminPermissionOptions, fullAdminRoles, type AdminPermission } from "@/lib/admin-permissions";
import { getStoredAccessToken } from "@/lib/supabase-rest";

const permissionRoutes: Record<AdminPermission, string> = {
  incident_actioning: "/admin/incidents",
  shift_verification: "/admin/reviews",
  scheduling: "/admin/scheduling",
  people: "/admin/clients",
  team: "/admin/team",
  billing: "/admin/billing",
  reports: "/admin/reports",
  settings: "/admin/settings"
};

export function AdminHome() {
  const [access, setAccess] = useState<{ role: string; permissions: AdminPermission[] } | null>(null);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    fetch("/api/auth/access?mode=admin", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((result: { allowed?: boolean; role?: string; adminPermissions?: AdminPermission[] }) => {
        if (result.allowed && result.role) setAccess({ role: result.role, permissions: result.adminPermissions || [] });
      })
      .catch(() => undefined);
  }, []);

  if (!access) return <div className="min-h-[55vh] bg-mist" aria-label="Loading admin workspace" />;
  if (fullAdminRoles.has(access.role)) return <AdminDashboard />;

  const assigned = adminPermissionOptions.filter((option) => access.permissions.includes(option.key));
  return (
    <>
      <PageHeader eyebrow="Manager workspace" title="Your assigned functions" description="Only the responsibilities granted by your organisation administrator are available here." actions={<StatusBadge label={`${assigned.length} assigned`} tone="blue" />} />
      <Section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assigned.map((option) => (
            <Card key={option.key} className="flex min-h-44 flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-800"><ShieldCheck size={19} aria-hidden="true" /></span>
              <h2 className="mt-4 text-lg font-semibold text-ink">{option.label}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
              <Link href={permissionRoutes[option.key]} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-teal-700">Open function <ArrowRight size={15} aria-hidden="true" /></Link>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
