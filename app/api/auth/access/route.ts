import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") === "platform" ? "platform" : "admin";
  const access = await verifyServerAccess(request, mode);

  if (!access.allowed) {
    return NextResponse.json({ allowed: false, reason: access.reason }, { status: access.status });
  }

  return NextResponse.json({
    allowed: true,
    role: access.role,
    organisationId: access.organisationId,
    email: access.email
  });
}

