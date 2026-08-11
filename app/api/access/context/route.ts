import { NextRequest, NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const result = await resolveUserAccessContext(request, {
    organisationId: request.nextUrl.searchParams.get("organisationId") || undefined,
    houseId: request.nextUrl.searchParams.get("houseId") || undefined,
    participantId: request.nextUrl.searchParams.get("participantId") || undefined
  });
  if (!result.context) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, ...result.context }, { headers: { "Cache-Control": "private, no-store" } });
}
