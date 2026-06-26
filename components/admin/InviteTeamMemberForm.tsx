import { Card, StatusBadge } from "@/components/ui";
import { participants } from "@/lib/sample-data";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { MailPlus, ShieldCheck } from "lucide-react";

export function InviteTeamMemberForm() {
  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Team onboarding</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Invite a staff member</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Add workers, managers, or admins and assign participant access before they start documenting.</p>
        </div>
        <StatusBadge label="Mock invite" tone="blue" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Full name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. Amina Joseph" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="email" placeholder="amina@example.com" />
        </label>
        <RoleSelector />
        <label className="block text-sm font-semibold text-slate-700">
          Invite status
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" defaultValue="pending">
            <option value="pending">Send invite email</option>
            <option value="draft">Save as draft</option>
            <option value="active">Create active demo user</option>
          </select>
        </label>
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700">Assign participants/clients</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {participants.map((participant) => (
            <label key={participant.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" defaultChecked={participant.id === "joseph-k"} />
              <span>
                <span className="block font-semibold text-ink">{participant.name}</span>
                <span className="block text-slate-600">{participant.supportNeeds}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift">
          <MailPlus size={18} aria-hidden="true" />
          Send invite
        </button>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <ShieldCheck size={18} aria-hidden="true" />
          Save permissions
        </button>
      </div>
    </Card>
  );
}
