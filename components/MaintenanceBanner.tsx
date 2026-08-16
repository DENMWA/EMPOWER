import { Wrench } from "lucide-react";
import { isReadOnlyMaintenanceMode } from "@/lib/maintenance";

export function MaintenanceBanner() {
  if (!isReadOnlyMaintenanceMode()) return null;
  return <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-950" role="status"><span className="inline-flex items-center gap-2"><Wrench size={16} aria-hidden="true" />Scheduled maintenance: records are available to view, but changes are temporarily paused.</span></div>;
}
