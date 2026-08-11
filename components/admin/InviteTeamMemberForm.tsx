"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { participants, type UserRole } from "@/lib/sample-data";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { MailPlus, ShieldCheck } from "lucide-react";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, houseHasClient, type HouseRecord } from "@/lib/house-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { createStaffId, roleLabelFor, saveTenantStaffInvite } from "@/lib/staff-records";
import { markTrialStepComplete } from "@/lib/trial-run";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { adminPermissionOptions, delegatedManagerRoles, type AdminPermission } from "@/lib/admin-permissions";
import { featurePermissionOptions, rolePermissionTemplates, type EmploymentType, type FeaturePermission } from "@/lib/feature-permissions";

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
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pendingStaffId, setPendingStaffId] = useState("");
  const [adminPermissions, setAdminPermissions] = useState<AdminPermission[]>([]);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("permanent");
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [featurePermissions, setFeaturePermissions] = useState<FeaturePermission[]>([]);
  const allParticipants = useMemo(() => storedClients.length ? storedClients : realMode ? [] : participants, [storedClients, realMode]);
  const accessibleHouseIds = useMemo(() => houseAccessMode === "all" ? houses.map((house) => house.id) : assignedHouseIds, [assignedHouseIds, houseAccessMode, houses]);
  const houseScopedParticipants = useMemo(() => {
    if (!houses.length) return allParticipants;
    const accessibleHouses = houses.filter((house) => accessibleHouseIds.includes(house.id));
    return allParticipants.filter((participant) => accessibleHouses.some((house) => houseHasClient(house, participant)));
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

    if (scopedAssignedParticipants.length !== assignedParticipants.length) {
      setAssignedParticipants(scopedAssignedParticipants);
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

  function toggleAdminPermission(permission: AdminPermission) {
    setAdminPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }

  function toggleFeaturePermission(permission: FeaturePermission) {
    const defaults = featurePermissions.length ? featurePermissions : rolePermissionTemplates[role];
    setFeaturePermissions(defaults.includes(permission) ? defaults.filter((item) => item !== permission) : [...defaults, permission]);
  }

  async function saveInvite(action: "sent" | "saved") {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail) {
      setSaved(false);
      setMessage("Add the staff member's name and email before saving.");
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    setMessage("Saving staff permissions...");
    const staffId = pendingStaffId || createStaffId(cleanName);
    if (!pendingStaffId) setPendingStaffId(staffId);
    const record = {
      id: staffId,
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
      createdAt: new Date().toISOString(),
      adminPermissions: delegatedManagerRoles.has(role) ? adminPermissions : [],
      employmentType,
      featurePermissions,
      assignmentStartDate,
      assignmentEndDate: assignmentEndDate || undefined
    };

    const localMessage = action === "sent" ? "Invite saved and marked ready to send." : "Permissions saved for this draft invite.";
    if (action === "sent") {
      const emailResult = await sendInvitationEmail({
        staffId,
        name: cleanName,
        email: cleanEmail,
        role,
        roleLabel: roleLabelFor(role),
        adminPermissions: delegatedManagerRoles.has(role) ? adminPermissions : [],
        assignedParticipantIds: assignedParticipants,
        houseAccessMode,
        assignedHouseIds: record.assignedHouseIds,
        resend: saveFailed,
        employmentType,
        featurePermissions,
        permissionTemplateKey: `${role}_default`,
        assignmentStartDate,
        assignmentEndDate: assignmentEndDate || undefined
      });
      setSaved(emailResult.ok);
      setMessage(emailResult.ok
        ? `Invitation sent to ${cleanEmail}. Access will activate after acceptance.`
        : emailResult.error || "The invitation could not be delivered.");
      setSaveFailed(!emailResult.ok);
      if (!emailResult.ok) {
        setSaving(false);
        return;
      }
    } else {
      const result = await saveTenantStaffInvite(record);
      setSaved(Boolean(result.savedToCloud));
      if (!result.savedToCloud) {
        setSaving(false);
        setSaveFailed(true);
        setMessage(`Cloud save failed. The staff details remain here for retry. ${result.error || "Try again."}`);
        return;
      }
      setMessage(`${localMessage} Saved to this organisation.`);
    }
    markTrialStepComplete("add-staff");
    setSaving(false);
    setPendingStaffId("");
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
      {delegatedManagerRoles.has(role) ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50/50 p-4">
          <p className="text-sm font-semibold text-ink">Manager function access</p>
          <p className="mt-1 text-sm text-slate-600">Select only the admin functions this manager is responsible for.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {adminPermissionOptions.map((option) => (
              <label key={option.key} className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={adminPermissions.includes(option.key)} onChange={() => toggleAdminPermission(option.key)} />
                <span>
                  <span className="block font-semibold text-ink">{option.label}</span>
                  <span className="block text-slate-600">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Full name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" placeholder="e.g. Support Worker B" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" type="email" placeholder="worker.b@demo.empowernotes.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <RoleSelector value={role} onChange={(nextRole) => { setRole(nextRole); setFeaturePermissions([]); setAdminPermissions([]); }} />
        <label className="block text-sm font-semibold text-slate-700">
          Employment type
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={employmentType} onChange={(event) => setEmploymentType(event.target.value as EmploymentType)}>
            <option value="casual">Casual</option><option value="permanent">Permanent</option><option value="part_time">Part-time</option><option value="contractor">Contractor</option><option value="other">Other</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">Assignment starts<input type="date" className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={assignmentStartDate} onChange={(event) => setAssignmentStartDate(event.target.value)} /></label>
        <label className="block text-sm font-semibold text-slate-700">Assignment ends <span className="font-normal text-slate-500">(optional)</span><input type="date" min={assignmentStartDate} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={assignmentEndDate} onChange={(event) => setAssignmentEndDate(event.target.value)} /></label>
        <label className="block text-sm font-semibold text-slate-700">
          Invite status
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={inviteStatus} onChange={(event) => setInviteStatus(event.target.value)}>
            <option value="pending">Send invite email</option>
            <option value="draft">Save as draft</option>
            <option value="active">Create active user</option>
          </select>
        </label>
      </div>
      <details className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Permission template and optional overrides</summary>
        <p className="mt-2 text-sm text-slate-600">The {roleLabelFor(role)} default is applied unless you change a permission below. Employment type never changes access.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {featurePermissionOptions.map((permission) => {
            const selected = (featurePermissions.length ? featurePermissions : rolePermissionTemplates[role]).includes(permission);
            return <label key={permission} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={selected} onChange={() => toggleFeaturePermission(permission)} className="h-4 w-4 accent-teal-700" />{permission.replaceAll("_", " ")}</label>;
          })}
        </div>
      </details>
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
        <p className="text-sm font-semibold text-slate-700">Optional participant-specific access</p>
        <p className="mt-1 text-sm text-slate-600">Participants in assigned houses are available automatically. Select individuals only as an additional access exception.</p>
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
        <button type="button" onClick={() => saveInvite("sent")} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
          <MailPlus size={18} aria-hidden="true" />
          {saving ? "Saving..." : saveFailed ? "Retry invite" : "Send invite"}
        </button>
        <button type="button" onClick={() => saveInvite("saved")} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100">
          <ShieldCheck size={18} aria-hidden="true" />
          Save permissions
        </button>
      </div>
      {message ? <p aria-live="polite" className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${saved ? "bg-emerald-50 text-emerald-700" : saveFailed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{message}</p> : null}
    </Card>
  );
}

async function sendInvitationEmail(input: {
  staffId: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  adminPermissions: AdminPermission[];
  assignedParticipantIds: string[];
  houseAccessMode: "all" | "selected";
  assignedHouseIds: string[];
  resend: boolean;
  employmentType: EmploymentType;
  featurePermissions: FeaturePermission[];
  permissionTemplateKey: string;
  assignmentStartDate: string;
  assignmentEndDate?: string;
}) {
  const accessToken = getStoredAccessToken();
  if (!accessToken) return { ok: false, error: "Sign in before sending invitation emails." };

  const response = await fetch("/api/team/invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const result = await response.json() as { ok?: boolean; error?: string };
  return { ok: Boolean(response.ok && result.ok), error: result.error || "" };
}
