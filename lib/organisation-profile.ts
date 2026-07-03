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
    profile.logoName ? `Logo: ${profile.logoName}` : "",
    ""
  ].filter(Boolean).join("\n");
}

export function withOrganisationReportHeader(title: string, body: string) {
  const header = getOrganisationReportHeader();
  return [header, title, body].filter(Boolean).join("\n");
}
