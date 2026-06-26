import { Card, StatusBadge } from "@/components/ui";
import { RecordActions } from "@/components/records/RecordActions";
import { getClientColourScheme } from "@/lib/client-colours";
import { documents, participants } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const dayMs = 24 * 60 * 60 * 1000;

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
          const reminder = getExpiryReminder(doc.expiryDate);
          return (
            <div key={doc.id} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border border-l-4 p-4", colour.border)}>
              <div className="flex items-start gap-3">
                <span className={cn("grid h-10 w-10 place-items-center rounded-md text-xs font-bold", colour.avatar)}>{participant?.initials ?? "CL"}</span>
                <div>
                  <p className="font-semibold text-ink">{doc.type}</p>
                  <p className="text-sm text-slate-600">{participant?.name ?? "Unassigned client"} - {doc.confidence}% extraction confidence</p>
                  <p className="mt-1 text-sm text-slate-600">Start: {formatDate(doc.startDate)} | Expiry: {formatDate(doc.expiryDate)}</p>
                  <span className={cn("mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", colour.badge)}>{colour.label} client file</span>
                  <RecordActions
                    className="mt-3"
                    recordId={doc.id}
                    recordType="document"
                    title={`${doc.type} - ${participant?.name ?? "Unassigned client"}`}
                    body={[
                      `Client: ${participant?.name ?? "Unassigned client"}`,
                      `Document type: ${doc.type}`,
                      `Status: ${doc.status}`,
                      `Visibility: ${doc.visibility}`,
                      `Start date: ${formatDate(doc.startDate)}`,
                      `Expiry date: ${formatDate(doc.expiryDate)}`,
                      `Reminder: ${reminder.label}`,
                      `Extraction confidence: ${doc.confidence}%`
                    ].join("\n")}
                    filename={`empower-notes-${doc.id}-${doc.type.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={reminder.label} tone={reminder.tone} />
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

function getExpiryReminder(expiryDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / dayMs);

  if (daysUntilExpiry < 0) {
    return { label: `Expired ${Math.abs(daysUntilExpiry)} days ago`, tone: "red" as const };
  }

  if (daysUntilExpiry <= 14) {
    return { label: `Fortnight reminder: ${daysUntilExpiry} days left`, tone: "red" as const };
  }

  if (daysUntilExpiry <= 30) {
    return { label: `One month reminder: ${daysUntilExpiry} days left`, tone: "amber" as const };
  }

  return { label: `Active: ${daysUntilExpiry} days left`, tone: "green" as const };
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
