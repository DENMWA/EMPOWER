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
  const safeBody = escapeHtml(body);
  const generatedAt = new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
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
    .page { max-width: 920px; margin: 32px auto; background: #ffffff; padding: 44px; border: 1px solid #cbd5e1; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
    .brand { display: flex; gap: 20px; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #0f766e; padding-bottom: 20px; margin-bottom: 26px; }
    .logo { max-width: 220px; max-height: 96px; object-fit: contain; }
    .details { font-size: 13px; line-height: 1.6; color: #334155; }
    .report-title { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 28px; color: #0f172a; letter-spacing: 0; }
    .status { border-radius: 6px; background: #ccfbf1; color: #134e4a; padding: 8px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 26px; }
    .meta div { border: 1px solid #e2e8f0; border-left: 4px solid #0f766e; border-radius: 6px; padding: 12px; background: #f8fafc; }
    .meta span { display: block; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .meta strong { display: block; margin-top: 4px; color: #0f172a; font-size: 13px; }
    .content { border: 1px solid #e2e8f0; border-radius: 6px; padding: 22px; font-size: 14px; line-height: 1.75; white-space: pre-wrap; }
    .signoff { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 28px; }
    .signoff div { min-height: 72px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }
    .signoff span { display: block; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 14px; color: #64748b; font-size: 12px; }
    @media print {
      body { background: #ffffff; }
      .page { margin: 0; max-width: none; border: 0; box-shadow: none; }
      .meta, .signoff { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">
    ${showBranding ? `<header class="brand"><div class="details">${details.map(escapeHtml).join("<br />")}</div>${logo}</header>` : ""}
    <div class="report-title">
      <h1>${safeTitle}</h1>
      <span class="status">Manager-ready draft</span>
    </div>
    <section class="meta">
      <div><span>Generated</span><strong>${escapeHtml(generatedAt)}</strong></div>
      <div><span>Report type</span><strong>${safeTitle}</strong></div>
      <div><span>Review status</span><strong>Requires authorised review</strong></div>
    </section>
    <section class="content">${safeBody}</section>
    <section class="signoff" aria-label="Report sign off">
      <div><span>Prepared by</span></div>
      <div><span>Reviewed by</span></div>
      <div><span>Date and signature</span></div>
    </section>
    <p class="footer">Generated by EmpowerNotes. Confirm all details against the provider record before submission, billing, audit, or external sharing.</p>
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
