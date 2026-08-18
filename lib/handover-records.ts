import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";
import { tenantStorageKey } from "@/lib/tenant-storage";

export type HandoverScope = "house" | "client" | "organisation";
export type HandoverEntry = {
  id: string;
  scopeType: HandoverScope;
  houseId: string;
  participantId: string;
  category: string;
  priority: "routine" | "important" | "urgent";
  summary: string;
  followUpAction: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  acknowledged: boolean;
};

type Row = {
  id: string; scope_type: HandoverScope; house_id: string | null; participant_id: string | null;
  category: string; priority: HandoverEntry["priority"]; summary: string; follow_up_action: string | null;
  source_type: string | null; source_id: string | null; created_at: string;
};

const handoverStorageKey = "empowernotes:handover-entries";
const handoverReadStorageKey = "empowernotes:handover-acknowledgements";
export const handoversUpdatedEvent = "empowernotes:handovers-updated";

type HandoverSaveResult = { saved: boolean; savedToCloud: boolean; error: string; entry?: HandoverEntry };

function createHandoverId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2, 14)}`.padEnd(36, "0");
}

function getLocalHandovers() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(tenantStorageKey(handoverStorageKey));
    return stored ? (JSON.parse(stored) as HandoverEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLocalHandovers(entries: HandoverEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tenantStorageKey(handoverStorageKey), JSON.stringify(entries));
  window.dispatchEvent(new Event(handoversUpdatedEvent));
}

function addLocalHandover(entry: HandoverEntry) {
  const entries = getLocalHandovers().filter((item) => item.id !== entry.id);
  saveLocalHandovers([entry, ...entries].slice(0, 200));
}

function getLocalAcknowledgements() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const stored = window.localStorage.getItem(tenantStorageKey(handoverReadStorageKey));
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function markLocalAcknowledged(id: string) {
  const ids = getLocalAcknowledgements();
  ids.add(id);
  if (typeof window !== "undefined") window.localStorage.setItem(tenantStorageKey(handoverReadStorageKey), JSON.stringify([...ids]));
  saveLocalHandovers(getLocalHandovers().map((entry) => entry.id === id ? { ...entry, acknowledged: true } : entry));
}

function fromRow(item: Row, acknowledgedIds: Set<string>): HandoverEntry {
  return {
    id: item.id, scopeType: item.scope_type || (item.participant_id ? "client" : "house"), houseId: item.house_id || "",
    participantId: item.participant_id || "", category: item.category, priority: item.priority, summary: item.summary,
    followUpAction: item.follow_up_action || "", sourceType: item.source_type || "", sourceId: item.source_id || "",
    createdAt: item.created_at, acknowledged: acknowledgedIds.has(item.id)
  };
}

export async function getRecentHandovers(hours = 24) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const localAcknowledgements = getLocalAcknowledgements();
  const localEntries = getLocalHandovers()
    .filter((entry) => entry.createdAt >= since)
    .map((entry) => ({ ...entry, acknowledged: entry.acknowledged || localAcknowledgements.has(entry.id) }));

  const [items, read] = await Promise.all([
    supabaseRequest<Row[]>("handover_entries", { query: `select=id,scope_type,house_id,participant_id,category,priority,summary,follow_up_action,source_type,source_id,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc` }),
    supabaseRequest<Array<{ handover_entry_id: string }>>("handover_acknowledgements", { query: "select=handover_entry_id" })
  ]);

  const cloudAcknowledgements = new Set((read.data || []).map((item) => item.handover_entry_id));
  const cloudEntries = (items.data || []).map((item) => fromRow(item, new Set([...cloudAcknowledgements, ...localAcknowledgements])));
  const byId = new Map([...localEntries, ...cloudEntries].map((entry) => [entry.id, entry]));
  return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createHandoverEntry(input: Omit<HandoverEntry, "id" | "sourceType" | "sourceId" | "createdAt" | "acknowledged">): Promise<HandoverSaveResult> {
  const entry: HandoverEntry = {
    ...input,
    id: createHandoverId(),
    category: input.scopeType === "organisation" ? "operational" : input.category,
    sourceType: "manual",
    sourceId: "",
    createdAt: new Date().toISOString(),
    acknowledged: false
  };
  addLocalHandover(entry);

  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { saved: true, savedToCloud: false, error: "Saved on this device. Sign in to save it to the organisation workspace.", entry };

  const result = await supabaseRequest<Array<{ id: string }>>("handover_entries", {
    method: "POST",
    body: {
      id: entry.id,
      organisation_id: organisationId, scope_type: entry.scopeType,
      house_id: entry.scopeType === "house" ? entry.houseId : null,
      participant_id: entry.scopeType === "client" ? entry.participantId : null,
      category: entry.category,
      priority: entry.priority, summary: entry.summary, follow_up_action: entry.followUpAction || null, created_by: userId
    }
  });
  if (result.data?.length && !result.error) return { saved: true, savedToCloud: true, error: "", entry };
  return { saved: true, savedToCloud: false, error: result.error || "Saved on this device. Workspace sync did not complete.", entry };
}

export async function acknowledgeHandover(entry: HandoverEntry) {
  markLocalAcknowledged(entry.id);
  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { saved: true, savedToCloud: false, error: "Marked as read on this device." };
  const result = await supabaseRequest<Array<{ handover_entry_id: string }>>("handover_acknowledgements", {
    method: "POST", query: "on_conflict=handover_entry_id,user_id", prefer: "resolution=merge-duplicates,return=representation",
    body: { handover_entry_id: entry.id, organisation_id: organisationId, user_id: userId }
  });
  if (result.data?.length && !result.error) return { saved: true, savedToCloud: true, error: "" };
  return { saved: true, savedToCloud: false, error: result.error || "Marked as read on this device. Workspace sync did not complete." };
}
