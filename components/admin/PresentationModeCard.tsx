"use client";

import { useEffect, useState } from "react";
import { Database, EyeOff } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getDataMode, setDataMode, type DataMode } from "@/lib/presentation-mode";

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Demo / Real mode</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Control what data appears during trials</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use Demo Mode for safe sample records in buyer meetings. Use Real Mode when you want only user-entered clients, staff, documents, and saved records.</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-800">
          {mode === "demo" ? <EyeOff size={20} aria-hidden="true" /> : <Database size={20} aria-hidden="true" />}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => chooseMode("demo")} className={`rounded-md border p-4 text-left ${mode === "demo" ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 bg-white"}`}>
          <span className="block font-semibold text-ink">Demo Mode</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">Show anonymous sample records and hide saved live data.</span>
        </button>
        <button type="button" onClick={() => chooseMode("real")} className={`rounded-md border p-4 text-left ${mode === "real" ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 bg-white"}`}>
          <span className="block font-semibold text-ink">Real Mode</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">Show only clients, staff, documents, and records entered by the user.</span>
        </button>
      </div>
      <div className="mt-4">
        <StatusBadge label={mode === "demo" ? "Safe sample records" : "User-entered data only"} tone={mode === "demo" ? "green" : "blue"} />
      </div>
    </Card>
  );
}
