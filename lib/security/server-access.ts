const adminRoles = new Set(["owner", "admin", "service_manager", "sole_provider"]);

type AccessMode = "admin" | "platform";

type AuthUser = {
  id?: string;
  email?: string;
};

type UserProfile = {
  role?: string;
  organisation_id?: string;
};

export type ServerAccessResult = {
  allowed: boolean;
  status: number;
  reason: string;
  userId: string;
  email: string;
  role: string;
  organisationId: string;
};

export async function verifyServerAccess(request: Request, mode: AccessMode): Promise<ServerAccessResult> {
  const denied = (status: number, reason: string): ServerAccessResult => ({
    allowed: false,
    status,
    reason,
    userId: "",
    email: "",
    role: "",
    organisationId: ""
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";

  if (!supabaseUrl || !supabaseAnonKey) return denied(503, "Secure workspace access is not configured.");
  if (!authorization.startsWith("Bearer ")) return denied(401, "Sign in to continue.");

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: authorization },
      cache: "no-store"
    });
    if (!authResponse.ok) return denied(401, "Your session is no longer valid. Sign in again.");

    const authUser = await authResponse.json() as AuthUser;
    if (!authUser.id) return denied(401, "The signed-in account could not be verified.");
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?select=role,organisation_id&id=eq.${encodeURIComponent(authUser.id)}&limit=1`,
      {
        headers: { apikey: supabaseAnonKey, Authorization: authorization },
        cache: "no-store"
      }
    );
    if (!profileResponse.ok) return denied(403, "Your workspace role could not be verified.");

    const profiles = await profileResponse.json() as UserProfile[];
    const profile = profiles[0];
    if (!profile?.role || !profile.organisation_id) return denied(403, "Your account is not connected to an organisation role.");

    if (mode === "admin" && !adminRoles.has(profile.role)) return denied(403, "Administrator access is required.");

    if (mode === "platform") {
      const ownerEmails = new Set(
        (process.env.PLATFORM_OWNER_EMAILS || "")
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      );
      const email = authUser.email?.toLowerCase() || "";
      if (profile.role !== "owner" || !email || !ownerEmails.has(email)) return denied(403, "Platform owner access is required.");
    }

    return {
      allowed: true,
      status: 200,
      reason: "",
      userId: authUser.id,
      email: authUser.email || "",
      role: profile.role,
      organisationId: profile.organisation_id
    };
  } catch {
    return denied(503, "Secure access verification is temporarily unavailable.");
  }
}
