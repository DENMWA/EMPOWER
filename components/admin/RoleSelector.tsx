import type { UserRole } from "@/lib/sample-data";

const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "support_worker", label: "Support Worker", description: "Create notes for assigned participants." },
  { value: "team_leader", label: "Team Leader", description: "Review team documentation and support workers." },
  { value: "case_manager", label: "Case Manager", description: "Oversee participant records, goals, and incidents." },
  { value: "service_manager", label: "Service Manager", description: "Manage quality, approvals, and service oversight." },
  { value: "admin", label: "Admin", description: "Manage team access, billing visibility, and settings." }
];

export function RoleSelector({ value = "support_worker", onChange }: { value?: UserRole; onChange?: (value: UserRole) => void }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      Role
      <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={value} onChange={(event) => onChange?.(event.target.value as UserRole)}>
        {roleOptions.map((role) => (
          <option key={role.value} value={role.value}>{role.label} - {role.description}</option>
        ))}
      </select>
    </label>
  );
}
