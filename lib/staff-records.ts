import type { StaffUser, UserRole } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { checkUserLimit } from "@/lib/subscriptions/client-limits";
import { tenantStorageKey } from "@/lib/tenant-storage";
import type { AdminPermission } from "@/lib/admin-permissions";

export type StaffRecord = StaffUser & {
  inviteStatus: "Invite sent" | "Draft" | "Active" | "Suspended";
  createdAt: string;
  adminPermissions?: AdminPermission[];
  authUserId?: string;
};

const staffStorageKey = "empowernotes:staff";
export const staffUpdatedEvent = "empowernotes:staff-updated";

export function createStaffId(name: string) {
  return globalThis.crypto?.randomUUID?.() || `staff-${Date.now()}-${name.length}`;
}

export function roleLabelFor(role: UserRole) {
  const labels: Record<UserRole, string> = {
    support_worker: "Support Worker",
    team_leader: "Team Leader",
    case_manager: "Case Manager",
    service_manager: "Service Manager",
    admin: "Admin",
    owner: "Provider Owner",
    sole_provider: "Sole Provider"
  };

  return labels[role];
}

export function getStoredStaff() {
  if (typeof window === "undefined") return [];
  if (isPresentationModeEnabled()) return [];

  try {
    const stored = window.sessionStorage.getItem(tenantStorageKey(staffStorageKey));
    return stored ? (JSON.parse(stored) as StaffRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredStaff(staff: StaffRecord[]) {
  window.sessionStorage.setItem(tenantStorageKey(staffStorageKey), JSON.stringify(staff));
  window.dispatchEvent(new Event(staffUpdatedEvent));
}

export function addStoredStaff(staff: StaffRecord) {
  const currentStaff = getStoredStaff();
  const withoutDuplicate = currentStaff.filter((item) => item.id !== staff.id && item.email.toLowerCase() !== staff.email.toLowerCase());
  saveStoredStaff([...withoutDuplicate, staff]);
}

export function updateStoredStaffStatus(staffId: string, inviteStatus: StaffRecord["inviteStatus"]) {
  const currentStaff = getStoredStaff();
  saveStoredStaff(currentStaff.map((staff) => staff.id === staffId ? { ...staff, inviteStatus } : staff));
}

export async function saveTenantStaffInvite(staff: StaffRecord) {
  const storedStaff = getStoredStaff();
  const limit = checkUserLimit(storedStaff.some((item) => item.id === staff.id) ? Math.max(0, storedStaff.length - 1) : storedStaff.length);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  const result = await staffApiRequest<Array<{ id: string }>>("POST", {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      inviteStatus: staff.inviteStatus,
      assignedParticipantIds: staff.assignedParticipants,
      houseAccessMode: staff.houseAccessMode || "selected",
      assignedHouseIds: staff.assignedHouseIds || [],
      adminPermissions: staff.adminPermissions || []
  });

  const cloudId = result.data?.[0]?.id;
  if (cloudId) {
    addStoredStaff({ ...staff, id: cloudId });
  }

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}

export async function updateTenantStaffInviteStatus(staffId: string, inviteStatus: StaffRecord["inviteStatus"]) {
  const result = await staffApiRequest<Array<{ id: string }>>("PATCH", { id: staffId, inviteStatus });

  const savedToCloud = Boolean(result.data?.length && !result.error);
  if (savedToCloud) updateStoredStaffStatus(staffId, inviteStatus);
  return { savedToCloud, error: result.error };
}

type SupabaseStaffInviteRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  invite_status: StaffRecord["inviteStatus"];
  assigned_participant_ids: string[] | null;
  assigned_house_ids?: string[] | null;
  house_access_mode?: StaffRecord["houseAccessMode"] | null;
  created_at: string;
  admin_permissions?: AdminPermission[] | null;
  auth_user_id?: string | null;
};

function toStaffRecord(row: SupabaseStaffInviteRow): StaffRecord {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    roleLabel: roleLabelFor(row.role),
    email: row.email,
    providerType: "organisation",
    qualityTrend: [0],
    assignedParticipants: row.assigned_participant_ids || [],
    houseAccessMode: row.house_access_mode || "selected",
    assignedHouseIds: row.assigned_house_ids || [],
    inviteStatus: row.invite_status,
    createdAt: row.created_at,
    adminPermissions: row.admin_permissions || [],
    authUserId: row.auth_user_id || undefined
  };
}

export async function getTenantStaffInvites() {
  if (isPresentationModeEnabled()) return [];
  const result = await staffApiRequest<SupabaseStaffInviteRow[]>("GET");

  if (!result.data || result.error) return [];

  const cloudStaff = result.data.map(toStaffRecord);
  return cloudStaff;
}

async function staffApiRequest<T>(method: "GET" | "POST" | "PATCH", body?: unknown) {
  const token = getStoredAccessToken();
  if (!token) return { data: null as T | null, error: "Sign in before accessing staff records." };
  const response = await fetch("/api/team/staff", {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) return { data: null as T | null, error: result.error || "Staff records could not be saved." };
  return { data: result as T, error: "" };
}
