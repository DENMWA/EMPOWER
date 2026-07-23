import type { Participant } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";
import { checkActiveParticipantLimit } from "@/lib/subscriptions/client-limits";

export type ClientRecord = Participant & {
  colourSchemeId?: string;
  primaryHouseId?: string;
  primaryHouseName?: string;
  serviceName?: string;
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
  if (isPresentationModeEnabled()) return [];

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
    createdAt: row.created_at
  };
}

export async function getTenantClients() {
  if (isPresentationModeEnabled()) return [];
  const localClients = getStoredClients();

  const result = await supabaseRequest<SupabaseClientRow[]>("participants_or_clients", {
    query: "select=id,name,support_needs,communication_preferences,risk_alerts,colour_scheme_id,goals,assigned_worker_ids,primary_house_id,primary_house_name,service_name,created_at&order=created_at.desc"
  });

  if (!result.data || result.error) return localClients;

  const cloudClients = result.data.map(toClientRecord);
  const localOnlyClients = localClients.filter((localClient) => !cloudClients.some((cloudClient) => cloudClient.id === localClient.id));
  return [...cloudClients, ...localOnlyClients];
}

export async function saveTenantClient(client: ClientRecord) {
  const limit = checkActiveParticipantLimit(getStoredClients().length);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  addStoredClient(client);

  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving to Supabase." };

  const result = await supabaseRequest<SupabaseClientRow[]>("participants_or_clients", {
    method: "POST",
    body: {
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
      service_name: client.serviceName || null
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}
