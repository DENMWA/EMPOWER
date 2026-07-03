import type { StaffUser, UserRole } from "@/lib/sample-data";

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
