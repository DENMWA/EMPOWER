import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import type { Participant } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function ParticipantProfile({ participant }: { participant: Participant }) {
  const colour = getClientColourScheme(participant.id);

  return (
    <Card className={cn("border-l-4", colour.border)}>
      <div className="flex items-start gap-4">
        <div className={cn("grid h-12 w-12 place-items-center rounded-md font-bold", colour.avatar)}>{participant.initials}</div>
        <div>
          <h2 className="text-xl font-semibold text-ink">{participant.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{participant.supportNeeds}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p><span className="font-semibold">Communication:</span> {participant.communication}</p>
        <div className="flex flex-wrap gap-2">{participant.goals.map((goal) => <StatusBadge key={goal} label={goal} tone="blue" />)}</div>
        <div className="flex flex-wrap gap-2">{participant.riskAlerts.map((risk) => <StatusBadge key={risk} label={risk} tone="amber" />)}</div>
        <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", colour.badge)}>{colour.label} reporting colour</span>
        <p className="text-slate-600">Documents: {participant.documents.join(", ")}</p>
      </div>
    </Card>
  );
}
