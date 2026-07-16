"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { participants, type UserRole } from "@/lib/sample-data";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { MailPlus, ShieldCheck } from "lucide-react";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { createStaffId, roleLabelFor, saveTenantStaffInvite } from "@/lib/staff-records";
import { markTrialStepComplete } from "@/lib/trial-run";

export function InviteTeamMemberForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("support_worker");
  const [inviteStatus, setInviteStatus] = useState("pending");
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [assignedParticipants, setAssignedParticipants] = useState<string[]>(["client-b"]);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const allParticipants = [...participants, ...storedClients];

  useEffect(() => {
    getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
  }, []);

  function toggleParticipant(participantId: string) {
    setAssignedParticipants((current) => current.includes(participantId) ? current.filter((item) => item !== participantId) : [...current, participantId]);
  }

  async function saveInvite(action: "sent" | "saved") {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail) {
      setSaved(false);
      setMessage("Add the staff member's name and email before saving.");
      return;
    }

    const record = {
      id: createStaffId(cleanName),
      name: cleanName,
      role,
      roleLabel: roleLabelFor(role),
      email: cleanEmail,
      providerType: "organisation" as const,
      qualityTrend: [0],
      assignedParticipants,
      inviteStatus: inviteStatus === "active" ? "Active" as const : action === "sent" ? "Invite sent" as const : "Draft" as const,
      createdAt: new Date().toISOString()
    };

    const result = await saveTenantStaffInvite(record);
    markTrialStepComplete("add-staff");
    setSaved(true);
    const localMessage = action === "sent" ? "Invite saved and marked ready to send." : "Permissions saved for this draft invite.";
    setMessage(result.savedToCloud ? `${localMessage} Saved to this organisation.` : `${localMessage} Sign in to save it to this organisation's Supabase space.`);
    setName("");
    setEmail("");
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Team onboarding</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Invite a staff member</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Add workers, managers, or admins and assign participant access before they start documenting.</p>
        </div>
        <StatusBadge label={saved ? "Staff saved" : "Admin save"} tone={saved ? "green" : "blue"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Full name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. Support Worker B" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="email" placeholder="worker.b@demo.empowernotes.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <RoleSelector value={role} onChange={setRole} />
        <label className="block text-sm font-semibold text-slate-700">
          Invite status
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={inviteStatus} onChange={(event) => setInviteStatus(event.target.value)}>
            <option value="pending">Send invite email</option>
            <option value="draft">Save as draft</option>
            <option value="active">Create active demo user</option>
          </select>
        </label>
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700">Assign participants/clients</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {allParticipants.map((participant) => (
            <label key={participant.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={assignedParticipants.includes(participant.id)} onChange={() => toggleParticipant(participant.id)} />
              <span>
                <span className="block font-semibold text-ink">{participant.name}</span>
                <span className="block text-slate-600">{participant.supportNeeds}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => saveInvite("sent")} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift">
          <MailPlus size={18} aria-hidden="true" />
          Send invite
        </button>
        <button type="button" onClick={() => saveInvite("saved")} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <ShieldCheck size={18} aria-hidden="true" />
          Save permissions
        </button>
      </div>
      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
    </Card>
  );
}
