"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";

const options = {
  "Sole provider": "Sole Provider Plan",
  "Small team": "Team Plan",
  "Growing provider": "Growth Plan",
  "Large organisation": "Enterprise Plan"
};

export function PlanRecommendation() {
  const [choice, setChoice] = useState<keyof typeof options>("Small team");
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">What best describes you?</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.keys(options) as Array<keyof typeof options>).map((option) => (
          <button key={option} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-skySoft" onClick={() => setChoice(option)}>
            {option}
          </button>
        ))}
      </div>
      <div className="mt-4"><StatusBadge label={`Recommended: ${options[choice]}`} tone="green" /></div>
    </Card>
  );
}
