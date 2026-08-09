import { AdminGate } from "@/components/admin/AdminGate";
import { AdminHome } from "@/components/admin/AdminHome";

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminHome />
    </AdminGate>
  );
}
