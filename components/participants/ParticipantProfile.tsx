import { Card, StatusBadge } from "@/components/ui";
import type { Participant } from "@/lib/sample-data";

export function ParticipantProfile({ participant }: { participant: Participant }) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-skySoft font-bold text-sky-900">{participant.initials}</div>
        <div>
          <h2 className="text-xl font-semibold text-ink">{participant.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{participant.supportNeeds}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p><span className="font-semibold">Communication:</span> {participant.communication}</p>
        <div className="flex flex-wrap gap-2">{participant.goals.map((goal) => <StatusBadge key={goal} label={goal} tone="blue" />)}</div>
        <div className="flex flex-wrap gap-2">{participant.riskAlerts.map((risk) => <StatusBadge key={risk} label={risk} tone="amber" />)}</div>
        <p className="text-slate-600">Documents: {participant.documents.join(", ")}</p>
      </div>
    </Card>
  );
}
