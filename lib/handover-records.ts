import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";

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

export async function getRecentHandovers(hours = 24) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const [items, read] = await Promise.all([
    supabaseRequest<Row[]>("handover_entries", { query: `select=id,scope_type,house_id,participant_id,category,priority,summary,follow_up_action,source_type,source_id,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc` }),
    supabaseRequest<Array<{ handover_entry_id: string }>>("handover_acknowledgements", { query: "select=handover_entry_id" })
  ]);
  const ids = new Set((read.data || []).map((item) => item.handover_entry_id));
  return (items.data || []).map((item): HandoverEntry => ({
    id: item.id, scopeType: item.scope_type || (item.participant_id ? "client" : "house"), houseId: item.house_id || "",
    participantId: item.participant_id || "", category: item.category, priority: item.priority, summary: item.summary,
    followUpAction: item.follow_up_action || "", sourceType: item.source_type || "", sourceId: item.source_id || "",
    createdAt: item.created_at, acknowledged: ids.has(item.id)
  }));
}

export async function createHandoverEntry(input: Omit<HandoverEntry, "id" | "sourceType" | "sourceId" | "createdAt" | "acknowledged">) {
  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { saved: false, error: "Sign in before saving handover information." };
  const result = await supabaseRequest<Array<{ id: string }>>("handover_entries", {
    method: "POST",
    body: {
      organisation_id: organisationId, scope_type: input.scopeType,
      house_id: input.scopeType === "house" ? input.houseId : null,
      participant_id: input.scopeType === "client" ? input.participantId : null,
      category: input.scopeType === "organisation" ? "operational" : input.category,
      priority: input.priority, summary: input.summary, follow_up_action: input.followUpAction || null, created_by: userId
    }
  });
  return { saved: Boolean(result.data?.length && !result.error), error: result.error };
}

export async function acknowledgeHandover(entry: HandoverEntry) {
  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { saved: false, error: "Sign in before acknowledging handover." };
  const result = await supabaseRequest<Array<{ handover_entry_id: string }>>("handover_acknowledgements", {
    method: "POST", query: "on_conflict=handover_entry_id,user_id", prefer: "resolution=merge-duplicates,return=representation",
    body: { handover_entry_id: entry.id, organisation_id: organisationId, user_id: userId }
  });
  return { saved: Boolean(result.data?.length && !result.error), error: result.error };
}
