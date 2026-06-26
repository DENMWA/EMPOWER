import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { documents, participants } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function DocumentVault() {
  return (
    <Card>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client organised files</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Document Vault</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Documents are shown with their assigned client so support evidence does not become mixed across profiles.</p>
      </div>
      <div className="mt-4 space-y-3">
        {documents.map((doc) => {
          const participant = participants.find((item) => item.id === doc.participantId);
          const colour = getClientColourScheme(doc.participantId);
          return (
            <div key={doc.id} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border border-l-4 p-4", colour.border)}>
              <div className="flex items-start gap-3">
                <span className={cn("grid h-10 w-10 place-items-center rounded-md text-xs font-bold", colour.avatar)}>{participant?.initials ?? "CL"}</span>
                <div>
                  <p className="font-semibold text-ink">{doc.type}</p>
                  <p className="text-sm text-slate-600">{participant?.name ?? "Unassigned client"} - {doc.confidence}% extraction confidence</p>
                  <span className={cn("mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", colour.badge)}>{colour.label} client file</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={doc.status} tone={doc.status.includes("verified") ? "green" : "amber"} />
                <StatusBadge label={doc.visibility} tone={doc.visibility === "manager-only" ? "red" : "blue"} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
