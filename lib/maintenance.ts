export const maintenanceMessage = "EmpowerNotes is temporarily read-only for scheduled maintenance. Your existing records remain available; saving will resume shortly.";

export function isReadOnlyMaintenanceMode() {
  return process.env.NEXT_PUBLIC_READ_ONLY_MAINTENANCE === "true";
}

export function maintenanceWriteError() {
  return isReadOnlyMaintenanceMode() ? maintenanceMessage : "";
}
