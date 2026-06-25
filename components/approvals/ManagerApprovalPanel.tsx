import { Card, StatusBadge } from "@/components/ui";
import { progressNotes, users } from "@/lib/sample-data";

export function ManagerApprovalPanel() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Manager Approval Workflow</h2>
      <div className="mt-4 space-y-4">
        {progressNotes.map((note) => {
          const staff = users.find((user) => user.id === note.staffId);
          return (
            <div key={note.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{note.supportType}</p>
                  <p className="text-sm text-slate-600">Submitted by {staff?.name} - original note and transcript preserved</p>
                </div>
                <StatusBadge label={note.status} tone={note.status === "Approved" ? "green" : "amber"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-md bg-sea px-3 py-2 text-sm font-semibold text-white">Approve</button>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Send back</button>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Lock final note</button>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Export PDF</button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
