import { StatusBadge } from "@/components/ui";
import type { UserRole } from "@/lib/sample-data";

const billingRoles: UserRole[] = ["owner", "admin", "service_manager"];

export function PlanBadge({ role }: { role: UserRole }) {
  if (!billingRoles.includes(role)) return null;
  return <StatusBadge label="Team Plan - admin only" tone="blue" />;
}
