"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { participants, type UserRole } from "@/lib/sample-data";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { MailPlus, ShieldCheck } from "lucide-react";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, type HouseRecord } from "@/lib/house-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { createStaffId, roleLabelFor, saveTenantStaffInvite } from "@/lib/staff-records";
import { markTrialStepComplete } from "@/lib/trial-run";

export function InviteTeamMemberForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("support_worker");
  const [inviteStatus, setInviteStatus] = useState("pending");
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [assignedParticipants, setAssignedParticipants] = useState<string[]>([]);
  const [houseAccessMode, setHouseAccessMode] = useState<"all" | "selected">("selected");
  const [assignedHouseIds, setAssignedHouseIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const allParticipants = useMemo(() => storedClients.length ? storedClients : realMode ? [] : participants, [storedClients, realMode]);
  const accessibleHouseIds = useMemo(() => houseAccessMode === "all" ? houses.map((house) => house.id) : assignedHouseIds, [assignedHouseIds, houseAccessMode, houses]);
  const houseScopedParticipants = useMemo(() => {
    if (!houses.length) return allParticipants;
    const clientIds = new Set(houses.filter((house) => accessibleHouseIds.includes(house.id)).flatMap((house) => house.clientIds));
    return allParticipants.filter((participant) => clientIds.has(participant.id));
  }, [accessibleHouseIds, allParticipants, houses]);

  useEffect(() => {
    getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
    getTenantHouses().then(setHouses).catch(() => setHouses([]));
  }, []);

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  useEffect(() => {
    if (!assignedHouseIds.length && houses[0]) {
      setAssignedHouseIds([houses[0].id]);
      return;
    }

    if (!houses.length && assignedHouseIds.length) {
      setAssignedHouseIds([]);
    }
  }, [assignedHouseIds, houses]);

  useEffect(() => {
    const scopedParticipantIds = new Set(houseScopedParticipants.map((participant) => participant.id));
    const scopedAssignedParticipants = assignedParticipants.filter((participantId) => scopedParticipantIds.has(participantId));

    if (houseScopedParticipants.length && scopedAssignedParticipants.length !== assignedParticipants.length) {
      setAssignedParticipants(scopedAssignedParticipants.length ? scopedAssignedParticipants : houseScopedParticipants.map((participant) => participant.id));
      return;
    }

    if (houseScopedParticipants.length && !assignedParticipants.length) {
      setAssignedParticipants(houseScopedParticipants.map((participant) => participant.id));
      return;
    }

    if (!houseScopedParticipants.length && assignedParticipants.length) {
      setAssignedParticipants([]);
    }
  }, [assignedParticipants, houseScopedParticipants]);

  function toggleParticipant(participantId: string) {
    setAssignedParticipants((current) => current.includes(participantId) ? current.filter((item) => item !== participantId) : [...current, participantId]);
  }

  function toggleHouse(houseId: string) {
    setAssignedHouseIds((current) => current.includes(houseId) ? current.filter((item) => item !== houseId) : [...current, houseId]);
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
      houseAccessMode,
      assignedHouseIds: houseAccessMode === "all" ? houses.map((house) => house.id) : assignedHouseIds,
      inviteStatus: inviteStatus === "active" ? "Active" as const : action === "sent" ? "Invite sent" as const : "Draft" as const,
      createdAt: new Date().toISOString()
    };

    const result = await saveTenantStaffInvite(record);
    if (result.error && result.error.includes("allows")) {
      setSaved(false);
      setMessage(result.error);
      return;
    }

    markTrialStepComplete("add-staff");
    setSaved(true);
    const localMessage = action === "sent" ? "Invite saved and marked ready to send." : "Permissions saved for this draft invite.";
    setMessage(result.savedToCloud ? `${localMessage} Saved to this organisation.` : `${localMessage} ${result.error || "Sign in to save it to this organisation's Supabase space."}`);
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
            <option value="active">Create active user</option>
          </select>
        </label>
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700">Assign house/service access</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <input type="radio" className="mt-1 h-4 w-4 accent-teal-700" checked={houseAccessMode === "all"} onChange={() => setHouseAccessMode("all")} />
            <span>
              <span className="block font-semibold text-ink">All houses/services</span>
              <span className="block text-slate-600">This staff member can document across every current house/service.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <input type="radio" className="mt-1 h-4 w-4 accent-teal-700" checked={houseAccessMode === "selected"} onChange={() => setHouseAccessMode("selected")} />
            <span>
              <span className="block font-semibold text-ink">Selected houses/services</span>
              <span className="block text-slate-600">Only clients in the selected houses will appear in notes and incidents.</span>
            </span>
          </label>
        </div>
        {houseAccessMode === "selected" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {!houses.length ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
                Add a house first, then return here to assign house-specific access.
              </div>
            ) : null}
            {houses.map((house) => (
              <label key={house.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={assignedHouseIds.includes(house.id)} onChange={() => toggleHouse(house.id)} />
                <span>
                  <span className="block font-semibold text-ink">{house.name}</span>
                  <span className="block text-slate-600">{house.serviceType}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700">Assign participants/clients</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {!houseScopedParticipants.length ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
              Add clients to the selected house/service first, then return here to assign participant access.
            </div>
          ) : null}
          {houseScopedParticipants.map((participant) => (
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
      {message ? <p className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${saved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-900"}`}>{message}</p> : null}
    </Card>
  );
}
