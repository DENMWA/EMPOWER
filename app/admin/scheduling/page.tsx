import { AdminGate } from "@/components/admin/AdminGate";
import { RosterPage } from "@/components/roster/RosterPage";

export default function AdminSchedulingPage() {
  return (
    <AdminGate>
      <RosterPage />
    </AdminGate>
  );
}
