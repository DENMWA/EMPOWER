import { Card } from "@/components/ui";
import { rewritePersonCentredLanguage } from "@/lib/ai-mock";

export function PersonCentredRewrite({ text }: { text: string }) {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Person-centred Language Checker</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-600">Original wording</p>
          <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-900">{text}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600">Improved wording</p>
          <p className="mt-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">{rewritePersonCentredLanguage(text)}</p>
        </div>
      </div>
    </Card>
  );
}
