"use client";

import { Eye } from "lucide-react";

export function AccessibilityToggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-ink">
      <Eye aria-hidden="true" size={17} />
      <span>Accessibility</span>
      <input
        aria-label="Toggle Accessibility Mode"
        className="h-5 w-5 accent-teal-700"
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
