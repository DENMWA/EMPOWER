import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-sea">{eyebrow}</p> : null}
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 text-lg leading-8 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("mx-auto max-w-7xl px-4 py-8", className)}>{children}</section>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-md border border-slate-200 bg-white p-5 shadow-soft", className)}>{children}</div>;
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

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700",
        variant === "primary" ? "bg-sea text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-ink hover:bg-slate-50"
      )}
    >
      {children}
    </a>
  );
}
