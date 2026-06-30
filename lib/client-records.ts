import type { Participant } from "@/lib/sample-data";

export type ClientRecord = Participant & {
  colourSchemeId?: string;
  createdAt: string;
};

const clientStorageKey = "empowernotes:clients";

export function createClientId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "client"}-${Date.now()}`;
}

export function getStoredClients() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(clientStorageKey);
    return stored ? (JSON.parse(stored) as ClientRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredClients(clients: ClientRecord[]) {
  window.localStorage.setItem(clientStorageKey, JSON.stringify(clients));
}

export function addStoredClient(client: ClientRecord) {
  const clients = getStoredClients();
  saveStoredClients([...clients, client]);
}
