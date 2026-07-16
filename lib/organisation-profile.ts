import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";

export type OrganisationProfile = {
  organisationName: string;
  providerNumber: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logoName: string;
  logoDataUrl: string;
  includeInDownloads: boolean;
};

const organisationProfileKey = "empowernotes:organisation-profile";

export const defaultOrganisationProfile: OrganisationProfile = {
  organisationName: "EmpowerNotes Demo Provider",
  providerNumber: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  logoName: "",
  logoDataUrl: "",
  includeInDownloads: false
};

export function getOrganisationProfile() {
  if (typeof window === "undefined") return defaultOrganisationProfile;

  try {
    const stored = window.localStorage.getItem(organisationProfileKey);
    return stored ? { ...defaultOrganisationProfile, ...(JSON.parse(stored) as OrganisationProfile) } : defaultOrganisationProfile;
  } catch {
    return defaultOrganisationProfile;
  }
}

export function saveOrganisationProfile(profile: OrganisationProfile) {
  window.localStorage.setItem(organisationProfileKey, JSON.stringify(profile));
}

export async function saveTenantOrganisationProfile(profile: OrganisationProfile) {
  saveOrganisationProfile(profile);

  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving to Supabase." };

  const result = await supabaseRequest<Array<{ organisation_id: string }>>("organisation_profiles", {
    method: "POST",
    query: "on_conflict=organisation_id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organisation_id: organisationId,
      organisation_name: profile.organisationName,
      provider_number: profile.providerNumber,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      address: profile.address,
      logo_name: profile.logoName,
      logo_data_url: profile.logoDataUrl,
      include_in_downloads: profile.includeInDownloads,
      updated_at: new Date().toISOString()
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}

export function getOrganisationReportHeader() {
  const profile = getOrganisationProfile();
  if (!profile.includeInDownloads) return "";

  return [
    profile.organisationName || "Organisation",
    profile.providerNumber ? `Provider/ABN: ${profile.providerNumber}` : "",
    profile.phone ? `Phone: ${profile.phone}` : "",
    profile.email ? `Email: ${profile.email}` : "",
    profile.website ? `Website: ${profile.website}` : "",
    profile.address ? `Address: ${profile.address}` : "",
    profile.logoName ? `Logo file: ${profile.logoName}` : "",
    ""
  ].filter(Boolean).join("\n");
}

export function withOrganisationReportHeader(title: string, body: string) {
  const header = getOrganisationReportHeader();
  return [header, title, body].filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "");
}

export function buildOrganisationReportHtml(title: string, body: string) {
  const profile = getOrganisationProfile();
  const showBranding = profile.includeInDownloads;
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br />");
  const logo = showBranding && profile.logoDataUrl
    ? `<img src="${escapeHtml(profile.logoDataUrl)}" alt="${escapeHtml(profile.organisationName || "Organisation")} logo" class="logo" />`
    : "";
  const details = showBranding ? [
    profile.organisationName || "Organisation",
    profile.providerNumber ? `Provider/ABN: ${profile.providerNumber}` : "",
    profile.phone ? `Phone: ${profile.phone}` : "",
    profile.email ? `Email: ${profile.email}` : "",
    profile.website ? `Website: ${profile.website}` : "",
    profile.address ? `Address: ${profile.address}` : ""
  ].filter(Boolean) : [];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
    .page { max-width: 900px; margin: 32px auto; background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; }
    .brand { display: flex; gap: 20px; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 28px; }
    .logo { max-width: 220px; max-height: 96px; object-fit: contain; }
    .details { font-size: 13px; line-height: 1.6; color: #334155; }
    h1 { margin: 0 0 20px; font-size: 26px; color: #0f172a; }
    .content { font-size: 14px; line-height: 1.7; white-space: normal; }
    @media print {
      body { background: #ffffff; }
      .page { margin: 0; max-width: none; border: 0; }
    }
  </style>
</head>
<body>
  <main class="page">
    ${showBranding ? `<header class="brand"><div class="details">${details.map(escapeHtml).join("<br />")}</div>${logo}</header>` : ""}
    <h1>${safeTitle}</h1>
    <section class="content">${safeBody}</section>
  </main>
</body>
</html>`;
}

export function downloadOrganisationReportHtml(filename: string, title: string, body: string) {
  const content = buildOrganisationReportHtml(title, body);
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameWithoutExtension(filename)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
