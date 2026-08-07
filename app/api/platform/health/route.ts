import { NextResponse } from "next/server";
import { runPlatformHealthScan } from "@/lib/platform-health";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });
  return NextResponse.json(await runPlatformHealthScan(), { headers: { "Cache-Control": "no-store" } });
}
