import { getTenantRetainedRecords, saveTenantRetainedRecord, type RetainedRecord } from "@/lib/retained-records";

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
    const stored = window.localStorage.getItem(houseStorageKey);
    return stored ? (JSON.parse(stored) as HouseRecord[]) : [];
  } catch {
    return [];
  }
}

function saveStoredHouses(houses: HouseRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(houseStorageKey, JSON.stringify(houses));
  window.dispatchEvent(new Event(housesUpdatedEvent));
}

export async function getTenantHouses() {
  const localHouses = getStoredHouses();
  const records = await getTenantRetainedRecords("house-profile").catch(() => []);
  const cloudHouses = records.map(parseHouseRecord).filter((house): house is HouseRecord => Boolean(house));
  const localOnlyHouses = localHouses.filter((localHouse) => !cloudHouses.some((cloudHouse) => cloudHouse.id === localHouse.id));
  return [...cloudHouses, ...localOnlyHouses];
}

export async function saveTenantHouse(house: HouseRecord) {
  const currentHouses = getStoredHouses();
  saveStoredHouses([...currentHouses.filter((item) => item.id !== house.id), house]);

  const result = await saveTenantRetainedRecord({
    id: `house-${house.id}`,
    type: "house-profile",
    title: `House - ${house.name}`,
    body: JSON.stringify(house, null, 2),
    savedAt: new Date().toISOString()
  });

  return result;
}

export function getHousesForClient(houses: HouseRecord[], clientId: string) {
  return houses.filter((house) => house.clientIds.includes(clientId));
}
