import { PlatformDashboard } from "@/components/platform/PlatformDashboard";
import { PlatformGate } from "@/components/platform/PlatformGate";

export default function PlatformPage() {
  return (
    <PlatformGate>
      <PlatformDashboard />
    </PlatformGate>
  );
}
