import { platformOrganisations, type PlatformOrganisationStatus } from "@/lib/platform-data";

type PlatformAccessOverride = {
  status: PlatformOrganisationStatus;
  reason: string;
  updatedAt: string;
};

const platformAccessKey = "empowernotes:platform-access-overrides";
const demoOrganisationKey = "empowernotes:demo-current-organisation";

function readOverrides() {
  if (typeof window === "undefined") return {} as Record<string, PlatformAccessOverride>;

  try {
    return JSON.parse(window.localStorage.getItem(platformAccessKey) || "{}") as Record<string, PlatformAccessOverride>;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, PlatformAccessOverride>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(platformAccessKey, JSON.stringify(overrides));
}

export function getPlatformAccessOverride(organisationId: string) {
  return readOverrides()[organisationId];
}

export function setPlatformAccessStatus(organisationId: string, status: PlatformOrganisationStatus, reason: string) {
  const overrides = readOverrides();
  overrides[organisationId] = {
    status,
    reason,
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
}

export function clearPlatformAccessStatus(organisationId: string) {
  const overrides = readOverrides();
  delete overrides[organisationId];
  writeOverrides(overrides);
}

export function getEffectivePlatformStatus(organisationId: string) {
  const fallback = platformOrganisations.find((organisation) => organisation.id === organisationId)?.status ?? "Active";
  return getPlatformAccessOverride(organisationId)?.status ?? fallback;
}

export function setDemoCurrentOrganisation(organisationId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(demoOrganisationKey, organisationId);
}

export function getDemoCurrentOrganisation() {
  if (typeof window === "undefined") return platformOrganisations[0]?.id ?? "";
  return window.localStorage.getItem(demoOrganisationKey) || platformOrganisations[0]?.id || "";
}

export function getDemoOrganisationAccess() {
  const organisationId = getDemoCurrentOrganisation();
  return {
    organisationId,
    organisation: platformOrganisations.find((item) => item.id === organisationId),
    status: getEffectivePlatformStatus(organisationId),
    override: getPlatformAccessOverride(organisationId)
  };
}

export function isAccessBlocked(status: PlatformOrganisationStatus) {
  return ["Payment risk", "Suspended", "Cancelled", "Locked review"].includes(status);
}
