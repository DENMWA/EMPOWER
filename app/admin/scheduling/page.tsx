import { AdminGate } from "@/components/admin/AdminGate";
import { RosterPage } from "@/components/roster/RosterPage";
import { ServerFeatureGate } from "@/components/subscription/ServerFeatureGate";

export default function AdminSchedulingPage() {
  return (
    <AdminGate>
      <ServerFeatureGate category="billing" feature="schedulingEnabled" title="Scheduling is not available on this plan">
        <RosterPage />
      </ServerFeatureGate>
    </AdminGate>
  );
}
