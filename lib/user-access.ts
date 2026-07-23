import { users, type StaffUser, type UserRole } from "@/lib/sample-data";
import { getStoredStaff } from "@/lib/staff-records";
import type { HouseRecord } from "@/lib/house-records";

export const currentUserStorageKey = "empowernotes:current-user";
const adminUnlockedStorageKey = "empower-notes-admin-unlocked";
export const accessChangedEvent = "empowernotes:access-updated";

export const adminRoles: UserRole[] = ["owner", "admin", "service_manager", "sole_provider"];

function isSuspendedUser(user: StaffUser) {
  return (user as StaffUser & { inviteStatus?: string }).inviteStatus === "Suspended";
}

export function canAccessAdmin(role: UserRole) {
  return adminRoles.includes(role);
}

export function getCurrentAppUser(): StaffUser {
  if (typeof window === "undefined") return users[1] ?? users[0];

  try {
    const stored = window.localStorage.getItem(currentUserStorageKey);
    if (stored) {
      const user = JSON.parse(stored) as StaffUser;
      if (!isSuspendedUser(user)) return user;
      window.localStorage.removeItem(currentUserStorageKey);
    }
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
  if (isSuspendedUser(user)) return;
  window.localStorage.setItem(currentUserStorageKey, JSON.stringify(user));
  window.dispatchEvent(new Event(accessChangedEvent));
}

export function setAdminCurrentUser() {
  const owner = users.find((user) => user.role === "owner") ?? users[0];
  setCurrentAppUser(owner);
}

export function getAvailableAppUsers() {
  if (typeof window === "undefined") return users;
  const storedStaff = getStoredStaff().filter((staff) => !isSuspendedUser(staff));
  return storedStaff.length ? [...users, ...storedStaff] : users;
}

export function getAccessibleParticipantIds(user = getCurrentAppUser()) {
  if (isSuspendedUser(user)) return [];
  if (canAccessAdmin(user.role)) return null;
  return user.assignedParticipants;
}

export function getAccessibleHouseIds(user = getCurrentAppUser()) {
  if (isSuspendedUser(user)) return [];
  if (canAccessAdmin(user.role) || user.houseAccessMode === "all") return null;
  return user.assignedHouseIds || [];
}

export function filterHousesByAccess(houses: HouseRecord[], user = getCurrentAppUser()) {
  const accessibleHouseIds = getAccessibleHouseIds(user);
  if (!accessibleHouseIds) return houses;
  if (!accessibleHouseIds.length && user.assignedParticipants.length) {
    return houses.filter((house) => house.clientIds.some((clientId) => user.assignedParticipants.includes(clientId)));
  }
  return houses.filter((house) => accessibleHouseIds.includes(house.id));
}

export function getAccessibleClientIdsForHouse(house: HouseRecord | undefined, user = getCurrentAppUser()) {
  if (!house) return [];
  const accessibleParticipantIds = getAccessibleParticipantIds(user);
  const houseClientIds = house.clientIds;
  if (!accessibleParticipantIds) return houseClientIds;
  return houseClientIds.filter((clientId) => accessibleParticipantIds.includes(clientId));
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
