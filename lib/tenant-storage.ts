import { getCurrentUserId } from "@/lib/supabase-rest";

export function tenantStorageKey(baseKey: string) {
  const userId = getCurrentUserId();
  return `${baseKey}:${userId || "public-demo"}`;
}

