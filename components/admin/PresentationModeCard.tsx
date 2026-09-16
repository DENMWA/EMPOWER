"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getDataMode, setDataMode, type DataMode } from "@/lib/presentation-mode";

const modeOptions: Array<{ value: DataMode; label: string; detail: string }> = [
  { value: "real", label: "Real", detail: "User-entered data only" },
  { value: "demo", label: "Demo", detail: "Safe sample records" }
];

export function PresentationModeCard() {
  const [mode, setMode] = useState<DataMode>("real");

  useEffect(() => {
    setMode(getDataMode());
  }, []);

  function chooseMode(next: DataMode) {
    setDataMode(next);
    setMode(next);
  }

  return (
    <Card className="border-sky-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Data mode</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Workspace records</h2>
        </div>
        <StatusBadge label={mode === "demo" ? "Demo" : "Real"} tone={mode === "demo" ? "green" : "blue"} />
      </div>
      <div className="mt-4 inline-grid rounded-md border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => chooseMode(option.value)}
            className={cn("min-h-11 rounded px-4 text-left text-sm transition", mode === option.value ? "bg-white text-ink shadow-sm ring-1 ring-teal-200" : "text-slate-600 hover:text-ink")}
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              {option.value === "real" ? <Database size={15} aria-hidden="true" /> : null}
              {option.label}
            </span>
            <span className="block text-xs text-slate-500">{option.detail}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
