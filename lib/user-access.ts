import { users, type StaffUser, type UserRole } from "@/lib/sample-data";
import { getStoredStaff } from "@/lib/staff-records";

export const currentUserStorageKey = "empowernotes:current-user";
const adminUnlockedStorageKey = "empower-notes-admin-unlocked";
export const accessChangedEvent = "empowernotes:access-updated";

export const adminRoles: UserRole[] = ["owner", "admin", "service_manager", "sole_provider"];

export function canAccessAdmin(role: UserRole) {
  return adminRoles.includes(role);
}

export function getCurrentAppUser(): StaffUser {
  if (typeof window === "undefined") return users[1] ?? users[0];

  try {
    const stored = window.localStorage.getItem(currentUserStorageKey);
    if (stored) return JSON.parse(stored) as StaffUser;
  } catch {
    // Fall through to the role-safe defaults below.
  }

  if (window.localStorage.getItem(adminUnlockedStorageKey) === "true") {
    return users.find((user) => user.role === "owner") ?? users[0];
  }

  return users.find((user) => user.role === "support_worker") ?? users[0];
}

export function setCurrentAppUser(user: StaffUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(currentUserStorageKey, JSON.stringify(user));
  window.dispatchEvent(new Event(accessChangedEvent));
}

export function setAdminCurrentUser() {
  const owner = users.find((user) => user.role === "owner") ?? users[0];
  setCurrentAppUser(owner);
}

export function getAvailableAppUsers() {
  if (typeof window === "undefined") return users;
  const storedStaff = getStoredStaff();
  return storedStaff.length ? [...users, ...storedStaff] : users;
}

export function getAccessibleParticipantIds(user = getCurrentAppUser()) {
  if (canAccessAdmin(user.role)) return null;
  return user.assignedParticipants;
}

export function filterByParticipantAccess<T extends { id: string }>(records: T[], user = getCurrentAppUser()) {
  const accessibleIds = getAccessibleParticipantIds(user);
  if (!accessibleIds) return records;
  return records.filter((record) => accessibleIds.includes(record.id));
}

export function filterRecordsByParticipantAccess<T extends { participantId: string }>(records: T[], user = getCurrentAppUser()) {
  const accessibleIds = getAccessibleParticipantIds(user);
  if (!accessibleIds) return records;
  return records.filter((record) => accessibleIds.includes(record.participantId));
}
