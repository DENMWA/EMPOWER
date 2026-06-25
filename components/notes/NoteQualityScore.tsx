import { Card, StatusBadge } from "@/components/ui";
import type { NoteQuality } from "@/lib/ai-mock";

export function NoteQualityScore({ quality }: { quality: NoteQuality }) {
  const rows = [
    ["Audit Readiness", `${quality.auditReadiness}%`],
    ["Person-centred language", `${quality.personCentredLanguage}/10`],
    ["Objective wording", `${quality.objectiveWording}/10`],
    ["Detail level", `${quality.detailLevel}/10`],
    ["Goal link", quality.goalConnection],
    ["Follow-up action", quality.followUpAction],
    ["Risk clarity", `${quality.riskClarity}/10`],
    ["Billing evidence score", `${quality.billingEvidenceScore}%`]
  ];
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">AI Note Quality Score</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">{label}</span>
            <StatusBadge label={value} tone={value === "Missing" || value === "Weak" ? "amber" : "green"} />
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {quality.improvements.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </Card>
  );
}
