import { getTenantRetainedRecords, saveTenantRetainedRecord, type RetainedRecord } from "@/lib/retained-records";
import { tenantStorageKey } from "@/lib/tenant-storage";
import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";

export type HouseRecord = {
  id: string;
  name: string;
  address: string;
  serviceType: string;
  clientIds: string[];
  createdAt: string;
};

const houseStorageKey = "empowernotes:houses";
export const housesUpdatedEvent = "empowernotes:houses-updated";

export function createHouseId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "house"}-${Date.now()}`;
}

function parseHouseRecord(record: RetainedRecord) {
  try {
    const house = JSON.parse(record.body) as HouseRecord;
    return house?.id && house?.name ? house : null;
  } catch {
    return null;
  }
}

export function getStoredHouses() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.sessionStorage.getItem(tenantStorageKey(houseStorageKey));
    return stored ? (JSON.parse(stored) as HouseRecord[]) : [];
  } catch {
    return [];
  }
}

function saveStoredHouses(houses: HouseRecord[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(tenantStorageKey(houseStorageKey), JSON.stringify(houses));
  window.dispatchEvent(new Event(housesUpdatedEvent));
}

export async function getTenantHouses() {
  const [locations, assignments] = await Promise.all([
    supabaseRequest<Array<{ id: string; name: string; address: string | null; service_type: string | null; created_at: string }>>("service_locations", { query: "select=id,name,address,service_type,created_at&status=eq.active&order=name.asc" }),
    supabaseRequest<Array<{ house_id: string; participant_id: string }>>("participant_house_assignments", { query: "select=house_id,participant_id&status=in.(active,scheduled)" })
  ]);
  if (locations.data?.length) {
    return locations.data.map((location): HouseRecord => ({
      id: location.id,
      name: location.name,
      address: location.address || "",
      serviceType: location.service_type || "Service location",
      clientIds: (assignments.data || []).filter((assignment) => assignment.house_id === location.id).map((assignment) => assignment.participant_id),
      createdAt: location.created_at
    }));
  }
  const records = await getTenantRetainedRecords("house-profile").catch(() => []);
  const cloudHouses = records.map(parseHouseRecord).filter((house): house is HouseRecord => Boolean(house));
  return cloudHouses;
}

export async function saveTenantHouse(house: HouseRecord) {
  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving this service location." };
  const location = await supabaseRequest<Array<{ id: string }>>("service_locations", {
    method: "POST",
    query: "on_conflict=organisation_id,id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: { organisation_id: organisationId, id: house.id, name: house.name, address: house.address || null, service_type: house.serviceType || null, status: "active", updated_at: new Date().toISOString() }
  });
  if (!location.data?.[0]?.id) return { savedToCloud: false, error: location.error || "The service location could not be secured." };
  const result = await saveTenantRetainedRecord({
    id: `house-${house.id}`,
    type: "house-profile",
    title: `House - ${house.name}`,
    body: JSON.stringify(house, null, 2),
    savedAt: new Date().toISOString()
  });

  if (result.savedToCloud) {
    const currentHouses = getStoredHouses();
    saveStoredHouses([...currentHouses.filter((item) => item.id !== house.id), house]);
  }

  return result;
}

type HouseClientReference = {
  id: string;
  primaryHouseId?: string;
  primaryHouseName?: string;
  serviceName?: string;
};

function normaliseName(value?: string) {
  return (value || "").trim().toLowerCase();
}

export function getHousesForClient(houses: HouseRecord[], client: string | HouseClientReference) {
  const clientId = typeof client === "string" ? client : client.id;
  return houses.filter((house) => {
    if (house.clientIds.includes(clientId)) return true;
    if (typeof client === "string") return false;
    return houseHasClient(house, client);
  });
}

export function houseHasClient(house: HouseRecord, client: HouseClientReference) {
  const houseName = normaliseName(house.name);
  const clientHouseName = normaliseName(client.primaryHouseName);

  return (
    house.clientIds.includes(client.id) ||
    client.primaryHouseId === house.id ||
    Boolean(clientHouseName && clientHouseName === houseName)
  );
}
