import { getEmployeeColourScheme } from "@/lib/roster";
import { users } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function EmployeeColourLegend() {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Employee colour legend">
      {users.map((worker) => {
        const colour = getEmployeeColourScheme(worker.id);
        return (
          <div key={worker.id} className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium", colour.softBg, colour.text, colour.border)}>
            <span className={cn("h-2.5 w-2.5 rounded-full", colour.dot)} aria-hidden="true" />
            {worker.name.split(" ")[0]}
          </div>
        );
      })}
    </div>
  );
}
