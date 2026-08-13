import type { Participant } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { supabaseRequest } from "@/lib/supabase-rest";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";
import { checkActiveParticipantLimit } from "@/lib/subscriptions/client-limits";
import { tenantStorageKey } from "@/lib/tenant-storage";

export type ClientRecord = Participant & {
  ndisNumber?: string;
  preferredName?: string;
  dateOfBirth?: string;
  pronouns?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  diagnoses?: string[];
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
  behaviourSupportNotes?: string;
  emergencyContacts?: Array<{ name: string; relationship: string; phone: string }>;
  keyWorkerId?: string;
  colourSchemeId?: string;
  primaryHouseId?: string;
  primaryHouseName?: string;
  serviceName?: string;
  profilePhotoPath?: string;
  createdAt: string;
  status?: "active" | "inactive";
  deactivatedAt?: string;
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
  profile_photo_path: string | null;
  ndis_number: string | null;
  preferred_name: string | null;
  date_of_birth: string | null;
  pronouns: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  diagnoses: string[] | null;
  medical_conditions: string[] | null;
  allergies: string[] | null;
  medications: string[] | null;
  behaviour_support_notes: string | null;
  emergency_contacts: Array<{ name?: string; relationship?: string; phone?: string }> | null;
  key_worker_id: string | null;
  created_at: string;
  status?: "active" | "inactive" | null;
  deactivated_at?: string | null;
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
    profilePhotoPath: row.profile_photo_path || undefined,
    ndisNumber: row.ndis_number || undefined,
    preferredName: row.preferred_name || undefined,
    dateOfBirth: row.date_of_birth || undefined,
    pronouns: row.pronouns || undefined,
    address: row.address || undefined,
    contactPhone: row.contact_phone || undefined,
    contactEmail: row.contact_email || undefined,
    diagnoses: row.diagnoses || [],
    medicalConditions: row.medical_conditions || [],
    allergies: row.allergies || [],
    medications: row.medications || [],
    behaviourSupportNotes: row.behaviour_support_notes || undefined,
    emergencyContacts: (row.emergency_contacts || []).map((contact) => ({
      name: contact.name || "",
      relationship: contact.relationship || "",
      phone: contact.phone || ""
    })),
    keyWorkerId: row.key_worker_id || undefined,
    createdAt: row.created_at,
    status: row.status === "inactive" ? "inactive" : "active",
    deactivatedAt: row.deactivated_at || undefined
  };
}

export async function getTenantClients(includeInactive = false) {
  if (isPresentationModeEnabled()) return [];
  const result = await supabaseRequest<SupabaseClientRow[]>("participants_or_clients", {
    query: `select=id,name,support_needs,communication_preferences,risk_alerts,colour_scheme_id,goals,assigned_worker_ids,primary_house_id,primary_house_name,service_name,profile_photo_path,ndis_number,preferred_name,date_of_birth,pronouns,address,contact_phone,contact_email,diagnoses,medical_conditions,allergies,medications,behaviour_support_notes,emergency_contacts,key_worker_id,status,deactivated_at,created_at${includeInactive ? "" : "&status=eq.active"}&order=created_at.desc`
  });

  if (!result.data || result.error) return [];

  const cloudClients = result.data.map(toClientRecord);
  return cloudClients;
}

export async function saveTenantClient(client: ClientRecord) {
  const storedClients = getStoredClients();
  const limit = checkActiveParticipantLimit(storedClients.some((item) => item.id === client.id) ? Math.max(0, storedClients.length - 1) : storedClients.length);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  const response = await fetch("/api/admin/clients", {
    method: "POST",
    headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: client.id,
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
      profile_photo_path: client.profilePhotoPath || null,
      ndis_number: client.ndisNumber || null,
      preferred_name: client.preferredName || null,
      date_of_birth: client.dateOfBirth || null,
      pronouns: client.pronouns || null,
      address: client.address || null,
      contact_phone: client.contactPhone || null,
      contact_email: client.contactEmail || null,
      diagnoses: client.diagnoses || [],
      medical_conditions: client.medicalConditions || [],
      allergies: client.allergies || [],
      medications: client.medications || [],
      behaviour_support_notes: client.behaviourSupportNotes || null,
      emergency_contacts: client.emergencyContacts || [],
      key_worker_id: client.keyWorkerId || null,
      status: client.status || "active"
    })
  });
  const result = await response.json().catch(() => ({})) as { client?: SupabaseClientRow; error?: string };
  const savedClient = result.client;
  if (savedClient?.id) {
    addStoredClient(toClientRecord(savedClient));
  }

  return { savedToCloud: response.ok && Boolean(savedClient), error: result.error || "", clientId: savedClient?.id || client.id };
}
