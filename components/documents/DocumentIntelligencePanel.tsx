import { Card, StatusBadge } from "@/components/ui";
import { getDocumentIntelligenceDemo } from "@/lib/document-intelligence";

export function DocumentIntelligencePanel() {
  const intelligence = getDocumentIntelligenceDemo();
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">AI Evidence Reader</h2>
      <p className="mt-2 text-slate-700">{intelligence.summary}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-600">Extracted goals</p>
          <div className="mt-2 flex flex-wrap gap-2">{intelligence.goals.map((goal) => <StatusBadge key={goal} label={goal} tone="blue" />)}</div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600">Risk-aware prompts</p>
          <div className="mt-2 flex flex-wrap gap-2">{intelligence.risks.map((risk) => <StatusBadge key={risk} label={risk} tone="amber" />)}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">Confidence score: {intelligence.confidenceScore}%. Manager verification is required before extracted information becomes authoritative.</p>
    </Card>
  );
}
