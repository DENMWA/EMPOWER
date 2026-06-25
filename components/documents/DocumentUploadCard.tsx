import { Card } from "@/components/ui";

export function DocumentUploadCard() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Upload Support Document</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">
          Document type
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3">
            {["NDIS Plan", "Behaviour support plan", "Risk assessment", "Communication profile", "Service agreement", "Other"].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Visibility
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3">
            <option>worker-visible</option>
            <option>manager-only</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Private file
          <input className="mt-2 w-full rounded-md border border-slate-300 p-2" type="file" />
        </label>
      </div>
      <p className="mt-3 text-sm text-slate-600">Demo mode stores metadata only. Production storage should use private Supabase buckets and server-side processing.</p>
    </Card>
  );
}
