import { Card, StatusBadge } from "@/components/ui";
import { documents, participants } from "@/lib/sample-data";

export function DocumentVault() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Document Vault</h2>
      <div className="mt-4 space-y-3">
        {documents.map((doc) => {
          const participant = participants.find((item) => item.id === doc.participantId);
          return (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-ink">{doc.type}</p>
                <p className="text-sm text-slate-600">{participant?.name} - {doc.confidence}% extraction confidence</p>
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
