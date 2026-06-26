import { FileUp, UserRoundCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { participants } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function DocumentUploadCard() {
  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client document upload</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Upload to a specific client</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Every document must be linked to a client before it enters the vault, keeping support plans, risk assessments, and evidence easy to find.</p>
        </div>
        <StatusBadge label="Client required" tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <label className="text-sm font-semibold text-slate-700">
          Client
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" required defaultValue="joseph-k">
            {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Document type
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3">
            {["NDIS Plan", "Behaviour support plan", "Risk assessment", "Communication profile", "Medical documents", "CHAP", "Service agreement", "Other"].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Visibility
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3">
            <option>worker-visible</option>
            <option>manager-only</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700 lg:col-span-3">
          Private file
          <input className="mt-2 w-full rounded-md border border-slate-300 p-2" type="file" />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {participants.map((participant) => {
          const colour = getClientColourScheme(participant.id);
          return (
            <div key={participant.id} className={cn("flex items-center gap-3 rounded-md border p-3", colour.border, colour.panel)}>
              <span className={cn("grid h-9 w-9 place-items-center rounded-md text-xs font-bold", colour.avatar)}>{participant.initials}</span>
              <div>
                <p className={cn("text-sm font-semibold", colour.text)}>{participant.name}</p>
                <p className="text-xs text-slate-600">Uploads use this client stream</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift">
          <FileUp size={18} aria-hidden="true" />
          Upload to client
        </button>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <UserRoundCheck size={18} aria-hidden="true" />
          Check client file list
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-600">Demo mode stores metadata only. Production storage should use private Supabase buckets, client-specific document paths, and server-side processing.</p>
    </Card>
  );
}
