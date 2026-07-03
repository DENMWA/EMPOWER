"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { participants, users, type StaffUser } from "@/lib/sample-data";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import { MoreHorizontal } from "lucide-react";

const inviteStatus: Record<string, { label: string; tone: "green" | "amber" | "blue" }> = {
  "dennis-mwangi": { label: "Owner", tone: "green" },
  "mary-wanjiku": { label: "Active", tone: "green" },
  "sarah-collins": { label: "Active", tone: "green" },
  "james-patel": { label: "Invite sent", tone: "amber" }
};

type TeamMember = StaffUser & { inviteStatus?: StaffRecord["inviteStatus"] };

export function TeamMembersTable() {
  const [storedStaff, setStoredStaff] = useState<StaffRecord[]>([]);
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const allUsers: TeamMember[] = [...users, ...storedStaff];
  const allParticipants = [...participants, ...storedClients];

  useEffect(() => {
    getTenantStaffInvites().then(setStoredStaff).catch(() => setStoredStaff([]));
    getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
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
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3 pr-4">Staff member</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Participant access</th>
              <th className="py-3 pr-4">Quality trend</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => {
              const assigned = allParticipants.filter((participant) => user.assignedParticipants.includes(participant.id));
              const storedStatus = user.inviteStatus;
              const status = storedStatus
                ? { label: storedStatus, tone: storedStatus === "Active" ? "green" as const : "amber" as const }
                : inviteStatus[user.id] ?? { label: "Pending", tone: "amber" as const };
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
                      {assigned.map((participant) => <StatusBadge key={participant.id} label={participant.name} tone="slate" />)}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Score</span>
                        <span>{user.qualityTrend.at(-1)}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-sea" style={{ width: `${user.qualityTrend.at(-1)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4"><StatusBadge label={status.label} tone={status.tone} /></td>
                  <td className="py-4 pr-4">
                    <a href="/admin/staff/new" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400" aria-label={`Manage ${user.name}`}>
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </a>
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
