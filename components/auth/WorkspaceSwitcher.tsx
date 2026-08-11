"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { getCurrentOrganisationId, getStoredAccessToken, switchActiveOrganisation } from "@/lib/supabase-rest";

type Workspace = { id: string; name: string; role: string };

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    Promise.all([
      fetch("/api/access/organisations", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).then((response) => response.json()),
      getCurrentOrganisationId()
    ]).then(([result, organisationId]: [{ organisations?: Workspace[] }, string]) => {
      setWorkspaces(result.organisations || []);
      setSelected(organisationId);
    }).catch(() => setWorkspaces([]));
  }, []);

  if (workspaces.length < 2) return null;

  async function selectWorkspace(organisationId: string) {
    if (!organisationId || organisationId === selected || busy) return;
    setBusy(true);
    let result = await switchActiveOrganisation(organisationId);
    if (result.requiresDraftDecision && window.confirm("You have an unsaved draft in this workspace. Keep it stored here and switch anyway?")) {
      result = await switchActiveOrganisation(organisationId, { discardUnsavedDrafts: true });
    }
    if (result.switched) window.location.assign("/dashboard");
    else setBusy(false);
  }

  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
      <Building2 size={16} aria-hidden="true" />
      <span className="sr-only">Organisation workspace</span>
      <select value={selected} disabled={busy} onChange={(event) => void selectWorkspace(event.target.value)} className="max-w-48 bg-transparent outline-none">
        {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select>
    </label>
  );
}
