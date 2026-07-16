"use client";

import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { isPresentationModeEnabled, setPresentationModeEnabled } from "@/lib/presentation-mode";

export function PresentationModeCard() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isPresentationModeEnabled());
  }, []);

  function toggle(next: boolean) {
    setPresentationModeEnabled(next);
    setEnabled(next);
  }

  return (
    <Card className="border-sky-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Presentation mode</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Hide saved client and staff records</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use this before demos or buyer meetings. It keeps anonymous demo records visible and hides saved browser/Supabase client and staff records without deleting them.</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-800">
          <EyeOff size={20} aria-hidden="true" />
        </span>
      </div>
      <label className="mt-5 flex items-start gap-3 rounded-md border border-sky-100 bg-sky-50/70 p-3 text-sm font-semibold text-sky-950">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={enabled} onChange={(event) => toggle(event.target.checked)} />
        Demo-safe mode is {enabled ? "on" : "off"}. Refresh open pages after changing this.
      </label>
      <div className="mt-4">
        <StatusBadge label={enabled ? "Live records hidden" : "Live records visible"} tone={enabled ? "green" : "blue"} />
      </div>
    </Card>
  );
}
