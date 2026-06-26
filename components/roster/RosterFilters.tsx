"use client";

import { Filter } from "lucide-react";
import { Card } from "@/components/ui";
import { rosterStatuses, type RosterFilters as RosterFiltersType } from "@/lib/roster";
import { users } from "@/lib/sample-data";

export function RosterFilters({ filters, onChange }: { filters: RosterFiltersType; onChange: (filters: RosterFiltersType) => void }) {
  return (
    <Card className="grid gap-4 lg:grid-cols-[auto_1fr_1fr_1fr] lg:items-end">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Filter size={18} aria-hidden="true" />
        Filters
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Worker
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={filters.workerId} onChange={(event) => onChange({ ...filters, workerId: event.target.value })}>
          <option value="all">All workers</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Status
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
          <option value="all">All statuses</option>
          {rosterStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notes
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={filters.noteState} onChange={(event) => onChange({ ...filters, noteState: event.target.value })}>
          <option value="all">All note states</option>
          <option value="required">Note required</option>
          <option value="completed">Note completed</option>
          <option value="not-required">No note required</option>
        </select>
      </label>
    </Card>
  );
}
