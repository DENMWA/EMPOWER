"use client";

import { useEffect, useState } from "react";
import { ManagerApprovalPanel } from "@/components/approvals/ManagerApprovalPanel";
import { AppointmentRemindersPanel } from "@/components/appointments/AppointmentRemindersPanel";
import { DashboardOperationalLists, ManagerDashboardCards, WorkerDashboardCards } from "@/components/dashboard/DashboardCards";
import { InvoiceReadinessPanel } from "@/components/invoicing/InvoiceReadinessPanel";
import { StaffProfiles } from "@/components/staff/StaffProfiles";
import { fullAdminRoles, type AdminPermission } from "@/lib/admin-permissions";
import { HouseScopeSelector } from "@/components/dashboard/HouseScopeSelector";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { DashboardHandoverPanel } from "@/components/dashboard/DashboardHandoverPanel";

type WorkspaceAccess = {
  role: string;
  permissions: AdminPermission[];
};

export function RoleAwareDashboard() {
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    fetch("/api/auth/access?mode=admin", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
      .then(async (response) => ({ response, result: await response.json() as { allowed?: boolean; role?: string; adminPermissions?: AdminPermission[] } }))
      .then(({ response, result }) => {
        if (!response.ok || !result.allowed || !result.role) return;
        setAccess({ role: result.role, permissions: result.adminPermissions || [] });
      })
      .catch(() => setAccess(null));
  }, []);

  const fullAccess = Boolean(access && fullAdminRoles.has(access.role));
  const can = (permission: AdminPermission) => fullAccess || Boolean(access?.permissions.includes(permission));
  return (
    <>
      <div className="mb-4 flex justify-end"><HouseScopeSelector /></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-7">
          <WorkerDashboardCards />
          {access ? <ManagerDashboardCards fullAccess={fullAccess} permissions={access.permissions} /> : null}
          {fullAccess ? <DashboardOperationalLists /> : null}
          {can("team") ? <StaffProfiles /> : null}
          {can("shift_verification") || can("billing") ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {can("shift_verification") ? <ManagerApprovalPanel /> : null}
              {can("billing") ? <InvoiceReadinessPanel /> : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <AppointmentRemindersPanel />
          <DashboardHandoverPanel />
        </div>
      </div>
    </>
  );
}
