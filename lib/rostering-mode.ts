import { tenantStorageKey } from "@/lib/tenant-storage";

export type RosteringMode = "built-in" | "imported" | "manual";

const rosteringModeKey = "empowernotes:rostering-mode";

export const rosteringModeOptions: Array<{ value: RosteringMode; label: string; description: string }> = [
  {
    value: "built-in",
    label: "Use EmpowerNotes roster",
    description: "Create, assign, review and report roster shifts inside EmpowerNotes."
  },
  {
    value: "imported",
    label: "Import from another roster",
    description: "Use an external rostering platform, then import shifts for notes, billing and reporting."
  },
  {
    value: "manual",
    label: "Manual shift details",
    description: "Do not run a roster here. Staff and admins enter shift details only when records need them."
  }
];

export function getRosteringMode(): RosteringMode {
  if (typeof window === "undefined") return "built-in";
  const stored = window.localStorage.getItem(tenantStorageKey(rosteringModeKey));
  return isRosteringMode(stored) ? stored : "built-in";
}

export function setRosteringMode(mode: RosteringMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tenantStorageKey(rosteringModeKey), mode);
  window.dispatchEvent(new Event("empowernotes:rostering-mode-updated"));
}

function isRosteringMode(value: string | null): value is RosteringMode {
  return value === "built-in" || value === "imported" || value === "manual";
}
