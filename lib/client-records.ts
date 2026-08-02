import type { Participant } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";
import { checkActiveParticipantLimit } from "@/lib/subscriptions/client-limits";
import { tenantStorageKey } from "@/lib/tenant-storage";

export type ClientRecord = Participant & {
  ndisNumber?: string;
  colourSchemeId?: string;
  primaryHouseId?: string;
  primaryHouseName?: string;
  serviceName?: string;
  createdAt: string;
};

const clientStorageKey = "empowernotes:clients";
export const clientsUpdatedEvent = "empowernotes:clients-updated";

export function createClientId(name: string) {
  return globalThis.crypto?.randomUUID?.() || `client-${Date.now()}-${name.length}`;
}

export function getStoredClients() {
  if (typeof window === "undefined") return [];
  if (isPresentationModeEnabled()) return [];

  try {
    const stored = window.sessionStorage.getItem(tenantStorageKey(clientStorageKey));
    return stored ? (JSON.parse(stored) as ClientRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredClients(clients: ClientRecord[]) {
  window.sessionStorage.setItem(tenantStorageKey(clientStorageKey), JSON.stringify(clients));
  window.dispatchEvent(new Event(clientsUpdatedEvent));
}

export function addStoredClient(client: ClientRecord) {
  const clients = getStoredClients();
  const withoutDuplicate = clients.filter((item) => item.id !== client.id && item.name.toLowerCase() !== client.name.toLowerCase());
  saveStoredClients([...withoutDuplicate, client]);
}

type SupabaseClientRow = {
  id: string;
  name: string;
  support_needs: string | null;
  communication_preferences: string | null;
  risk_alerts: string[] | null;
  colour_scheme_id: string | null;
  goals: string[] | null;
  assigned_worker_ids: string[] | null;
  primary_house_id: string | null;
  primary_house_name: string | null;
  service_name: string | null;
  ndis_number: string | null;
  created_at: string;
};

function toClientRecord(row: SupabaseClientRow): ClientRecord {
  return {
    id: row.id,
    name: row.name,
    initials: row.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 4).toUpperCase(),
    supportNeeds: row.support_needs || "Support needs to be added.",
    communication: row.communication_preferences || "Communication preferences to be added.",
    goals: row.goals || [],
    riskAlerts: row.risk_alerts || [],
    assignedWorkers: row.assigned_worker_ids || [],
    documents: [],
    colourSchemeId: row.colour_scheme_id || undefined,
    primaryHouseId: row.primary_house_id || undefined,
    primaryHouseName: row.primary_house_name || undefined,
    serviceName: row.service_name || undefined,
    ndisNumber: row.ndis_number || undefined,
    createdAt: row.created_at
  };
}

export async function getTenantClients() {
  if (isPresentationModeEnabled()) return [];
  const result = await supabaseRequest<SupabaseClientRow[]>("participants_or_clients", {
    query: "select=id,name,support_needs,communication_preferences,risk_alerts,colour_scheme_id,goals,assigned_worker_ids,primary_house_id,primary_house_name,service_name,ndis_number,created_at&order=created_at.desc"
  });

  if (!result.data || result.error) return [];

  const cloudClients = result.data.map(toClientRecord);
  return cloudClients;
}

export async function saveTenantClient(client: ClientRecord) {
  const storedClients = getStoredClients();
  const limit = checkActiveParticipantLimit(storedClients.some((item) => item.id === client.id) ? Math.max(0, storedClients.length - 1) : storedClients.length);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving to your workspace." };

  const result = await supabaseRequest<SupabaseClientRow[]>("participants_or_clients", {
    method: "POST",
    query: "on_conflict=id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: client.id,
      organisation_id: organisationId,
      name: client.name,
      support_needs: client.supportNeeds,
      communication_preferences: client.communication,
      risk_alerts: client.riskAlerts,
      colour_scheme_id: client.colourSchemeId || null,
      goals: client.goals,
      assigned_worker_ids: client.assignedWorkers,
      primary_house_id: client.primaryHouseId || null,
      primary_house_name: client.primaryHouseName || null,
      service_name: client.serviceName || null,
      ndis_number: client.ndisNumber || null
    }
  });

  const savedClient = result.data?.[0];
  if (savedClient?.id) {
    addStoredClient(toClientRecord(savedClient));
  }

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error, clientId: savedClient?.id || client.id };
}
