import { getEmployeeColourScheme } from "@/lib/roster";
import { cn } from "@/lib/utils";

export function EmployeeColourLegend({ workers = [] }: { workers?: Array<{ id: string; name: string }> }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Employee colour legend">
      {workers.map((worker) => {
        const colour = getEmployeeColourScheme(worker.id);
        return (
          <div key={worker.id} className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium", colour.softBg, colour.text, colour.border)}>
            <span className={cn("h-2.5 w-2.5 rounded-full", colour.dot)} aria-hidden="true" />
            {worker.name}
          </div>
        );
      })}
    </div>
  );
}
