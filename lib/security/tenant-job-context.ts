export type TenantJobAuthority =
  | { mode: "user"; initiatingUserId: string; requiredPermission: string }
  | { mode: "system"; authority: "platform_maintenance" | "subscription_webhook" | "scheduled_compliance" };

export type TenantJobContext = {
  organisationId: string;
  resourceIds: string[];
  correlationId: string;
  authority: TenantJobAuthority;
};

export function validateTenantJobContext(value: TenantJobContext) {
  if (!value.organisationId || !value.correlationId || !value.authority) throw new Error("Tenant job authority is incomplete.");
  if (value.authority.mode === "user" && (!value.authority.initiatingUserId || !value.authority.requiredPermission)) {
    throw new Error("User-authorised tenant jobs must identify the user and required permission.");
  }
  return value;
}

// Executors must re-resolve user membership or verify the declared system authority
// immediately before reading tenant resources. Active workspace pointers are never job authority.
