import { FilePlus2, Palette, Save } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourOptions } from "@/lib/client-colours";
import { sampleGoals, users } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function AddClientForm() {
  const colourOptions = getClientColourOptions();

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client intake</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Add a client profile</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Capture the client details that shape worker notes, roster planning, risk reporting, document evidence, and admin dashboards.</p>
        </div>
        <StatusBadge label="Mock client record" tone="blue" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Client full name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. Grace M." />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Initials
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. GM" maxLength={4} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Support needs
          <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Daily living, community access, behaviour support, communication support..." />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Communication preferences
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Preferred prompts, processing time, consent notes, communication aids..." />
        </label>
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Risk alerts
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="Known triggers, escalation instructions, medication prompts, falls risk..." />
        </label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">Assigned goals</p>
          <div className="mt-3 grid gap-3">
            {sampleGoals.slice(0, 5).map((goal, index) => (
              <label key={goal} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" defaultChecked={index < 2} />
                <span className="font-medium text-ink">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">Assign staff access</p>
          <div className="mt-3 grid gap-3">
            {users.map((user, index) => (
              <label key={user.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" defaultChecked={index === 0} />
                <span>
                  <span className="block font-semibold text-ink">{user.name}</span>
                  <span className="block text-slate-600">{user.roleLabel}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-teal-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">Client reporting colour</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {colourOptions.map((colour, index) => (
            <label key={colour.id} className={cn("flex items-center gap-3 rounded-md border p-3 text-sm", colour.border, colour.panel)}>
              <input type="radio" name="client-colour" className="h-4 w-4 accent-teal-700" defaultChecked={index === 0} />
              <span className={cn("h-6 w-6 rounded-md", colour.bar)} />
              <span className={cn("font-semibold", colour.text)}>{colour.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift">
          <Save size={18} aria-hidden="true" />
          Save client
        </button>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <FilePlus2 size={18} aria-hidden="true" />
          Add document later
        </button>
      </div>
    </Card>
  );
}
