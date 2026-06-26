import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
          {eyebrow ? <p className="mb-3 inline-flex rounded-md bg-mint px-3 py-1 text-sm font-semibold text-teal-900">{eyebrow}</p> : null}
          <h1 className="max-w-4xl text-4xl font-bold leading-tight text-ink sm:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("mx-auto max-w-7xl px-4 py-10", className)}>{children}</section>;
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-slate-200 bg-white/95 p-5 shadow-soft", className)} {...props}>{children}</div>;
}

export function StatusBadge({ label, tone = "slate" }: { label: string; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-800"
  };
  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", tones[tone])}>{label}</span>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700",
        variant === "primary" ? "bg-sea text-white shadow-lift hover:bg-teal-800" : "border border-slate-300 bg-white text-ink hover:border-teal-400 hover:bg-slate-50"
      )}
    >
      {children}
    </a>
  );
}
