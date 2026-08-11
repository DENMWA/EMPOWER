import { getCachedOrganisationId, getCurrentUserId } from "@/lib/supabase-rest";

export function tenantStorageKey(baseKey: string) {
  const userId = getCurrentUserId();
  if (!userId) return `${baseKey}:public-demo`;
  return `${baseKey}:${userId}:${getCachedOrganisationId() || "organisation-unresolved"}`;
}
