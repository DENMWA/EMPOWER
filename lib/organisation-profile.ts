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
