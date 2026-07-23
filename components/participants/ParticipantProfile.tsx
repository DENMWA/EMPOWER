import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import type { Participant } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type ProfileParticipant = Participant & { primaryHouseName?: string; serviceName?: string };

type ProfileStats = {
  documents: number;
  incidents: number;
  progressNotes: number;
  latestActivity?: string;
};

export function ParticipantProfile({ participant, colourSchemeId, stats }: { participant: ProfileParticipant; colourSchemeId?: string; stats?: ProfileStats }) {
  const colour = getClientColourScheme(participant.id, colourSchemeId);
  const documentCount = stats?.documents ?? participant.documents.length;

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
        {participant.primaryHouseName || participant.serviceName ? (
          <p><span className="font-semibold">House/service:</span> {[participant.primaryHouseName, participant.serviceName].filter(Boolean).join(" - ")}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">{participant.goals.map((goal) => <StatusBadge key={goal} label={goal} tone="blue" />)}</div>
        <div className="flex flex-wrap gap-2">{participant.riskAlerts.map((risk) => <StatusBadge key={risk} label={risk} tone="amber" />)}</div>
        <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", colour.badge)}>{colour.label} reporting colour</span>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Progress notes" value={stats?.progressNotes ?? 0} />
          <Metric label="Documents" value={documentCount} />
          <Metric label="Incidents" value={stats?.incidents ?? 0} tone={stats?.incidents ? "amber" : "slate"} />
        </div>
        {stats?.latestActivity ? <p className="text-slate-600">Latest activity: {formatActivityDate(stats.latestActivity)}</p> : null}
        {participant.documents.length ? <p className="text-slate-600">Profile documents: {participant.documents.join(", ")}</p> : null}
      </div>
    </Card>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" }) {
  return (
    <div className={cn("rounded-md p-3", tone === "amber" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-ink")}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}
