import { Card, StatusBadge } from "@/components/ui";
import { templates } from "@/lib/sample-data";

export function TemplatesPanel() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Documentation Templates</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {templates.map((template) => <StatusBadge key={template} label={template} tone="blue" />)}
      </div>
    </Card>
  );
}
