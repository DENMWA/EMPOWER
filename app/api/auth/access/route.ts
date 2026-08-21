import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import { isAdminPermission } from "@/lib/admin-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") === "platform" ? "platform" : "admin";
  const requestedPermission = params.get("permission") || "";
  if (requestedPermission && !isAdminPermission(requestedPermission)) {
    return NextResponse.json({ allowed: false, reason: "Unknown admin function." }, { status: 400 });
  }
  const permission = requestedPermission && isAdminPermission(requestedPermission) ? requestedPermission : undefined;
  const access = await verifyServerAccess(request, mode, permission);

  if (!access.allowed) {
    return NextResponse.json({ allowed: false, reason: access.reason, requiresMfa: access.requiresMfa || false }, { status: access.status });
  }

  return NextResponse.json({
    allowed: true,
    role: access.role,
    organisationId: access.organisationId,
    membershipId: access.membershipId,
    email: access.email,
    name: access.name,
    permissions: access.permissions,
    adminPermissions: access.adminPermissions
  });
}
