"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { participants, users, type StaffUser } from "@/lib/sample-data";
import { clientsUpdatedEvent, getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, housesUpdatedEvent, type HouseRecord } from "@/lib/house-records";
import { getTenantStaffInvites, staffUpdatedEvent, updateTenantStaffInviteStatus, type StaffRecord } from "@/lib/staff-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { accessChangedEvent, currentUserStorageKey, setCurrentAppUser } from "@/lib/user-access";
import { Eye, MoreHorizontal, Power, RotateCcw } from "lucide-react";

const inviteStatus: Record<string, { label: string; tone: "green" | "amber" | "blue" | "red" }> = {
  "provider-owner": { label: "Owner", tone: "green" },
  "support-worker-a": { label: "Active", tone: "green" },
  "service-manager-a": { label: "Active", tone: "green" },
  "team-lead-a": { label: "Invite sent", tone: "amber" }
};

type TeamMember = StaffUser & { inviteStatus?: StaffRecord["inviteStatus"] };

export function TeamMembersTable() {
  const [storedStaff, setStoredStaff] = useState<StaffRecord[]>([]);
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [message, setMessage] = useState("");
  const allUsers: TeamMember[] = useMemo(() => storedStaff.length ? storedStaff : realMode ? [] : users, [storedStaff, realMode]);
  const allParticipants = useMemo(() => storedClients.length ? storedClients : realMode ? [] : participants, [storedClients, realMode]);

  useEffect(() => {
    function loadRecords() {
      getTenantStaffInvites().then(setStoredStaff).catch(() => setStoredStaff([]));
      getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
      getTenantHouses().then(setHouses).catch(() => setHouses([]));
    }

    loadRecords();
    window.addEventListener(clientsUpdatedEvent, loadRecords);
    window.addEventListener(housesUpdatedEvent, loadRecords);
    window.addEventListener(staffUpdatedEvent, loadRecords);
    return () => {
      window.removeEventListener(clientsUpdatedEvent, loadRecords);
      window.removeEventListener(housesUpdatedEvent, loadRecords);
      window.removeEventListener(staffUpdatedEvent, loadRecords);
    };
  }, []);

  async function changeStaffStatus(user: TeamMember, nextStatus: StaffRecord["inviteStatus"]) {
    const result = await updateTenantStaffInviteStatus(user.id, nextStatus);
    setStoredStaff((current) => current.map((staff) => staff.id === user.id ? { ...staff, inviteStatus: nextStatus } : staff));
    if (nextStatus === "Suspended") {
      try {
        const currentUser = JSON.parse(window.localStorage.getItem(currentUserStorageKey) || "null") as TeamMember | null;
        if (currentUser?.id === user.id) {
          window.localStorage.removeItem(currentUserStorageKey);
          window.dispatchEvent(new Event(accessChangedEvent));
        }
      } catch {
        window.localStorage.removeItem(currentUserStorageKey);
      }
    }
    setMessage(result.savedToCloud ? `${user.name} is now marked as ${nextStatus}.` : `${user.name} is now marked as ${nextStatus} locally. ${result.error || "Sign in to save this to the workspace."}`);
  }

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Team directory</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Staff access and documentation quality</h2>
        </div>
        <StatusBadge label={`${allUsers.length} staff records`} tone="blue" />
      </div>
      {message ? <p className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">{message}</p> : null}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3 pr-4">Staff member</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">House access</th>
              <th className="py-3 pr-4">Participant access</th>
              <th className="py-3 pr-4">Quality trend</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!allUsers.length ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-600">
                  No staff records yet. Add a staff member to start the real team directory.
                </td>
              </tr>
            ) : null}
            {allUsers.map((user) => {
              const assigned = allParticipants.filter((participant) => user.assignedParticipants.includes(participant.id));
              const latestQualityScore = user.qualityTrend[user.qualityTrend.length - 1] ?? 0;
              const storedStatus = user.inviteStatus;
              const status = storedStatus
                ? { label: storedStatus, tone: storedStatus === "Active" ? "green" as const : storedStatus === "Suspended" ? "red" as const : "amber" as const }
                : inviteStatus[user.id] ?? { label: "Pending", tone: "amber" as const };
              const canSuspend = Boolean(storedStatus && storedStatus !== "Suspended");
              const canReactivate = storedStatus === "Suspended";
              const canPreview = storedStatus !== "Suspended";
              return (
                <tr key={user.id} className="border-b border-slate-100 align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-ink">{user.name}</p>
                    <p className="text-slate-600">{user.email}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge label={user.roleLabel} tone={user.role === "owner" || user.role === "service_manager" ? "green" : "blue"} />
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex max-w-md flex-wrap gap-2">
                      {user.houseAccessMode === "all" ? (
                        <StatusBadge label="All houses/services" tone="green" />
                      ) : (
                        houses.filter((house) => user.assignedHouseIds?.includes(house.id)).map((house) => <StatusBadge key={house.id} label={house.name} tone="blue" />)
                      )}
                      {user.houseAccessMode !== "all" && !houses.some((house) => user.assignedHouseIds?.includes(house.id)) ? <StatusBadge label="No house assigned" tone="amber" /> : null}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex max-w-md flex-wrap gap-2">
                      {assigned.map((participant) => <StatusBadge key={participant.id} label={participant.name} tone="slate" />)}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Score</span>
                        <span>{latestQualityScore}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-sea" style={{ width: `${latestQualityScore}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4"><StatusBadge label={status.label} tone={status.tone} /></td>
                  <td className="py-4 pr-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!canPreview}
                        onClick={() => {
                          if (!canPreview) return;
                          setCurrentAppUser(user);
                          setMessage(`Previewing app access as ${user.name}. The main app will now show only what this role can access.`);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        aria-label={`Preview access for ${user.name}`}
                      >
                        <Eye size={18} aria-hidden="true" />
                      </button>
                      <a href="/admin/staff/new" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400" aria-label={`Manage ${user.name}`}>
                        <MoreHorizontal size={18} aria-hidden="true" />
                      </a>
                      {canSuspend ? (
                        <button
                          type="button"
                          onClick={() => changeStaffStatus(user, "Suspended")}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:border-red-400"
                          aria-label={`Suspend ${user.name}`}
                        >
                          <Power size={18} aria-hidden="true" />
                        </button>
                      ) : null}
                      {canReactivate ? (
                        <button
                          type="button"
                          onClick={() => changeStaffStatus(user, "Active")}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400"
                          aria-label={`Reactivate ${user.name}`}
                        >
                          <RotateCcw size={18} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
