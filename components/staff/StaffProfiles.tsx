"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { clientsUpdatedEvent, getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, housesUpdatedEvent, type HouseRecord } from "@/lib/house-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { participants, users, type StaffUser } from "@/lib/sample-data";
import { getTenantStaffInvites, staffUpdatedEvent, type StaffRecord } from "@/lib/staff-records";

type StaffProfileRecord = StaffUser | StaffRecord;
type StaffProfileStatus = StaffRecord["inviteStatus"] | "Active";

export function StaffProfiles() {
  const [storedStaff, setStoredStaff] = useState<StaffRecord[]>([]);
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const staffProfiles = useMemo(() => storedStaff.length ? storedStaff : realMode ? [] : users, [realMode, storedStaff]);
  const clientProfiles = useMemo(() => storedClients.length ? storedClients : realMode ? [] : participants, [realMode, storedClients]);

  useEffect(() => {
    function loadRecords() {
      getTenantStaffInvites().then(setStoredStaff).catch(() => setStoredStaff([]));
      getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
      getTenantHouses().then(setHouses).catch(() => setHouses([]));
    }

    loadRecords();
    window.addEventListener(clientsUpdatedEvent, loadRecords);
    window.addEventListener(staffUpdatedEvent, loadRecords);
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    window.addEventListener(housesUpdatedEvent, loadRecords);
    return () => {
      window.removeEventListener(clientsUpdatedEvent, loadRecords);
      window.removeEventListener(staffUpdatedEvent, loadRecords);
      window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
      window.removeEventListener(housesUpdatedEvent, loadRecords);
    };
  }, []);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Staff directory</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Staff Profiles</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Live staff cards showing role, invite status, house access, and client assignment.</p>
        </div>
        <StatusBadge label={`${staffProfiles.length} staff profile${staffProfiles.length === 1 ? "" : "s"}`} tone="blue" />
      </div>

      {!staffProfiles.length ? (
        <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="font-semibold text-ink">No staff profiles yet</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Admin can add staff, assign house/service access, and choose client access before workers start testing.</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {staffProfiles.map((user) => {
          const assignedClients = clientProfiles.filter((client) => user.assignedParticipants.includes(client.id));
          const assignedHouses = getAssignedHouses(user, houses);
          const latestQualityScore = user.qualityTrend[user.qualityTrend.length - 1] ?? 0;
          const inviteStatus = getInviteStatus(user);
          const houseAccessMode = user.houseAccessMode || "selected";
          return (
            <div key={user.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="text-sm text-slate-600">{user.roleLabel} - {user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={inviteStatus} tone={inviteStatus === "Active" ? "green" : inviteStatus === "Suspended" ? "red" : "amber"} />
                  <StatusBadge label={`Quality ${latestQualityScore}%`} tone={latestQualityScore >= 75 ? "green" : "amber"} />
                </div>
              </div>

              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p><span className="font-semibold text-slate-700">House/service access:</span> {houseAccessMode === "all" ? "All houses/services" : assignedHouses.map((house) => house.name).join(", ") || "No house assigned"}</p>
                <p><span className="font-semibold text-slate-700">Assigned clients:</span> {assignedClients.map((client) => client.name).join(", ") || "No clients assigned"}</p>
                <p><span className="font-semibold text-slate-700">Testing note:</span> Voice use, approval history, and documentation quality will populate as workers save records.</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function getAssignedHouses(user: StaffProfileRecord, houses: HouseRecord[]) {
  if (user.houseAccessMode === "all") return houses;
  const assignedHouseIds = user.assignedHouseIds || [];
  return houses.filter((house) => assignedHouseIds.includes(house.id));
}

function getInviteStatus(user: StaffProfileRecord): StaffProfileStatus {
  if (!("inviteStatus" in user)) return "Active";
  return isStaffProfileStatus(user.inviteStatus) ? user.inviteStatus : "Active";
}

function isStaffProfileStatus(value: unknown): value is StaffProfileStatus {
  return value === "Invite sent" || value === "Draft" || value === "Active" || value === "Suspended";
}
