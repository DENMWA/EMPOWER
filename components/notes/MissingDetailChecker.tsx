import { Card, StatusBadge } from "@/components/ui";

export function MissingDetailChecker({ missing }: { missing: string[] }) {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Missing Detail Checker</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {missing.length ? missing.map((item) => <StatusBadge key={item} label={item} tone="amber" />) : <StatusBadge label="No missing details detected" tone="green" />}
      </div>
    </Card>
  );
}
