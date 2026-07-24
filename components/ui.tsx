import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <section className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
        <div className="max-w-4xl">
          {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{eyebrow}</p> : null}
          <h1 className="max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8", className)}>{children}</section>;
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_rgba(15,23,42,0.035)]", className)} {...props}>{children}</div>;
}

export function StatusBadge({ label, tone = "slate" }: { label: string; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-800"
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5", tones[tone])}>{label}</span>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700",
        variant === "primary" ? "bg-sea text-white shadow-[0_8px_20px_-10px_rgba(15,118,110,0.9)] hover:bg-teal-800" : "border border-slate-300 bg-white text-ink shadow-sm hover:border-slate-400 hover:bg-slate-50"
      )}
    >
      {children}
    </a>
  );
}
