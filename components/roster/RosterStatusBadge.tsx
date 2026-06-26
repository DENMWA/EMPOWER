import { cn } from "@/lib/utils";
import type { RosterStatus } from "@/lib/roster";

const statusStyles: Record<RosterStatus, string> = {
  Scheduled: "bg-slate-100 text-slate-800",
  "In Progress": "bg-sky-50 text-sky-800",
  Completed: "bg-emerald-50 text-emerald-800",
  "Note Required": "bg-amber-50 text-amber-900",
  "Note Completed": "bg-teal-50 text-teal-900",
  Cancelled: "bg-red-50 text-red-800",
  "No Show": "bg-rose-50 text-rose-800"
};

export function RosterStatusBadge({ status, className }: { status: RosterStatus; className?: string }) {
  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", statusStyles[status], className)}>{status}</span>;
}
