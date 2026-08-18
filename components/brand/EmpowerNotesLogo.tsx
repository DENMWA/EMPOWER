"use client";

import { useId } from "react";
import { SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";

type EmpowerNotesLogoProps = {
  variant?: "app" | "platform";
  tagline?: string;
  className?: string;
};

export function EmpowerNotesLogo({ variant = "app", tagline, className }: EmpowerNotesLogoProps) {
  const platform = variant === "platform";

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center", platform && "rounded-lg bg-slate-950 text-white shadow-sm ring-1 ring-slate-800")}>
        {platform ? <SquareTerminal size={19} aria-hidden="true" /> : <EmpowerNotesMark />}
      </span>
      <span className="min-w-0">
        <span className="block text-[17px] font-bold leading-5 text-ink">
          {platform ? "EmpowerNotes Platform" : "EmpowerNotes"}
        </span>
        {tagline ? <span className="block text-xs font-normal text-slate-500">{tagline}</span> : null}
      </span>
    </span>
  );
}

function EmpowerNotesMark() {
  const curveId = useId();

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9">
      <defs>
        <linearGradient id={curveId} x1="7" y1="33" x2="41" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ccfbf1" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <path d="M12 13h17M12 24h14M12 35h17" stroke="#17212b" strokeWidth="5.2" strokeLinecap="round" />
      <path d="M12 13v22" stroke="#17212b" strokeWidth="5.2" strokeLinecap="round" />
      <path d="M30 35V13l7.5 22V13" stroke="#19324d" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 31.5c9 7.8 18-8.5 31-3.8" fill="none" stroke={`url(#${curveId})`} strokeWidth="4.4" strokeLinecap="round" />
    </svg>
  );
}
