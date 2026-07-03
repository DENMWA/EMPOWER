"use client";

import { useState } from "react";
import { Building2, Save } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { createCurrentUserOrganisation } from "@/lib/supabase-rest";

export function OrganisationAccountSetup() {
  const [organisationName, setOrganisationName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [providerType, setProviderType] = useState<"organisation" | "sole_provider">("organisation");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  async function createAccount() {
    if (!organisationName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      setSaved(false);
      setMessage("Add the organisation, owner name, and owner email first.");
      return;
    }

    const result = await createCurrentUserOrganisation({
      organisationName: organisationName.trim(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      providerType
    });

    setSaved(Boolean(result.data && !result.error));
    setMessage(result.data && !result.error
      ? "Organisation account created. Future clients, staff, notes, reports, and documents will stay inside this organisation."
      : "Sign in with Supabase Auth first, then create the organisation account.");
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">SaaS account setup</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Create a private organisation space</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Each business gets its own protected account so clients, staff, notes, reports, billing, and branding are not visible to other organisations.</p>
        </div>
        <StatusBadge label={saved ? "Tenant ready" : "Requires sign in"} tone={saved ? "green" : "amber"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Organisation / business name" value={organisationName} onChange={setOrganisationName} />
        <Field label="Owner full name" value={ownerName} onChange={setOwnerName} />
        <Field label="Owner email" value={ownerEmail} onChange={setOwnerEmail} type="email" />
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Provider type
          <select value={providerType} onChange={(event) => setProviderType(event.target.value as "organisation" | "sole_provider")} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm">
            <option value="organisation">Organisation / team provider</option>
            <option value="sole_provider">Sole provider</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={createAccount} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <Save size={17} aria-hidden="true" />
          Create organisation space
        </button>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Building2 size={17} aria-hidden="true" />
          Supabase protected tenant
        </span>
      </div>
      {message ? <p className={saved ? "mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"}>{message}</p> : null}
    </Card>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm" />
    </label>
  );
}
