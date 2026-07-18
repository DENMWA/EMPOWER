import { Card, StatusBadge } from "@/components/ui";
import { participants, users } from "@/lib/sample-data";

export function StaffProfiles() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Staff Profiles</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {users.map((user) => {
          const assigned = participants.filter((participant) => user.assignedParticipants.includes(participant.id));
          const latestQualityScore = user.qualityTrend[user.qualityTrend.length - 1] ?? 0;
          return (
            <div key={user.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="text-sm text-slate-600">{user.roleLabel} - {user.email}</p>
                </div>
                <StatusBadge label={`Quality ${latestQualityScore}%`} tone="green" />
              </div>
              <p className="mt-3 text-sm text-slate-600">Assigned participants/clients: {assigned.map((participant) => participant.name).join(", ")}</p>
              <p className="mt-2 text-sm text-slate-600">Voice documentation usage and approval history are ready for manager review during testing.</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
