import { Card, StatusBadge } from "@/components/ui";
import { generateAuditPack } from "@/lib/ai-mock";

export function AuditPackGenerator() {
  const pack = generateAuditPack();
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Audit Pack Generator</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Participant/client<input className="mt-2 w-full rounded-md border border-slate-300 p-3" defaultValue={pack.participant} /></label>
        <label className="text-sm font-semibold text-slate-700">Start date<input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" defaultValue="2026-06-01" /></label>
        <label className="text-sm font-semibold text-slate-700">End date<input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" defaultValue="2026-06-30" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{pack.sections.map((section) => <StatusBadge key={section} label={section} tone="blue" />)}</div>
      <button className="mt-4 rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Generate PDF audit pack</button>
    </Card>
  );
}
