import type { StaffUser, UserRole } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";
import { checkUserLimit } from "@/lib/subscriptions/client-limits";

export type StaffRecord = StaffUser & {
  inviteStatus: "Invite sent" | "Draft" | "Active";
  createdAt: string;
};

const staffStorageKey = "empowernotes:staff";

export function createStaffId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "staff"}-${Date.now()}`;
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
    const stored = window.localStorage.getItem(staffStorageKey);
    return stored ? (JSON.parse(stored) as StaffRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredStaff(staff: StaffRecord[]) {
  window.localStorage.setItem(staffStorageKey, JSON.stringify(staff));
}

export function addStoredStaff(staff: StaffRecord) {
  const currentStaff = getStoredStaff();
  saveStoredStaff([...currentStaff, staff]);
}

export async function saveTenantStaffInvite(staff: StaffRecord) {
  const limit = checkUserLimit(getStoredStaff().length);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  addStoredStaff(staff);

  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving to Supabase." };

  const result = await supabaseRequest<Array<{ id: string }>>("staff_invites", {
    method: "POST",
    body: {
      organisation_id: organisationId,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      invite_status: staff.inviteStatus,
      assigned_participant_ids: staff.assignedParticipants,
      house_access_mode: staff.houseAccessMode || "selected",
      assigned_house_ids: staff.assignedHouseIds || []
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
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
    createdAt: row.created_at
  };
}

export async function getTenantStaffInvites() {
  if (isPresentationModeEnabled()) return [];
  const localStaff = getStoredStaff();

  const result = await supabaseRequest<SupabaseStaffInviteRow[]>("staff_invites", {
    query: "select=id,name,email,role,invite_status,assigned_participant_ids,house_access_mode,assigned_house_ids,created_at&order=created_at.desc"
  });

  if (!result.data || result.error) return localStaff;

  const cloudStaff = result.data.map(toStaffRecord);
  const localOnlyStaff = localStaff.filter((localRecord) => !cloudStaff.some((cloudRecord) => cloudRecord.id === localRecord.id));
  return [...cloudStaff, ...localOnlyStaff];
}
