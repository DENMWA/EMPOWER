import { AdminGate } from "@/components/admin/AdminGate";
import { RosterPage } from "@/components/roster/RosterPage";

export default function RosterRoute() {
  return (
    <AdminGate>
      <RosterPage />
    </AdminGate>
  );
}
