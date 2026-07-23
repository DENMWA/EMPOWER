"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImagePlus, Save } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { defaultOrganisationProfile, getTenantOrganisationProfile, saveTenantOrganisationProfile, type OrganisationProfile } from "@/lib/organisation-profile";

export function OrganisationBrandingForm() {
  const [profile, setProfile] = useState<OrganisationProfile>(defaultOrganisationProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getTenantOrganisationProfile().then(setProfile).catch(() => setProfile(defaultOrganisationProfile));
  }, []);

  function update<K extends keyof OrganisationProfile>(field: K, value: OrganisationProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function handleLogo(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      update("logoDataUrl", String(reader.result || ""));
      update("logoName", file.name);
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    const result = await saveTenantOrganisationProfile(profile);
    setMessage(result.savedToCloud ? "Organisation branding saved to this organisation." : "Branding saved locally. Sign in to save it to this organisation's Supabase space.");
  }

  return (
    <Card className="border-teal-100 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Report branding</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Logo and contact details</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Save your provider logo and details once, then include them in downloadable reports, billing summaries, audit packs, notes, documents, and incident collections.</p>
        </div>
        <StatusBadge label={profile.includeInDownloads ? "Included in downloads" : "Optional"} tone={profile.includeInDownloads ? "green" : "blue"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Organisation name" value={profile.organisationName} onChange={(value) => update("organisationName", value)} />
        <Field label="Provider number / ABN" value={profile.providerNumber} onChange={(value) => update("providerNumber", value)} />
        <Field label="Phone" value={profile.phone} onChange={(value) => update("phone", value)} />
        <Field label="Email" value={profile.email} onChange={(value) => update("email", value)} />
        <Field label="Website" value={profile.website} onChange={(value) => update("website", value)} />
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Upload logo
          <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink hover:border-teal-400">
            <ImagePlus size={17} aria-hidden="true" />
            {profile.logoName || "Choose logo image"}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleLogo(event.target.files?.[0])} />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
          Address
          <textarea value={profile.address} onChange={(event) => update("address", event.target.value)} className="min-h-24 rounded-md border border-slate-300 bg-white p-3 text-sm leading-6 text-ink shadow-sm" />
        </label>
      </div>

      {profile.logoDataUrl ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Logo preview</p>
          <Image src={profile.logoDataUrl} alt="Organisation logo preview" width={240} height={96} unoptimized className="mt-3 max-h-24 rounded-md bg-white object-contain p-2" />
        </div>
      ) : null}

      <label className="mt-5 flex items-start gap-3 rounded-md border border-teal-100 bg-teal-50/70 p-3 text-sm font-semibold text-teal-950">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={profile.includeInDownloads} onChange={(event) => update("includeInDownloads", event.target.checked)} />
        Include this logo and organisation details in downloadable reports.
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={saveProfile} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <Save size={17} aria-hidden="true" />
          Save branding
        </button>
        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </div>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm" />
    </label>
  );
}
