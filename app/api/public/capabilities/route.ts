import { NextResponse } from "next/server";
import { getPublicCapabilitiesPayload } from "@/lib/ai-discoverability";

export function GET() {
  return NextResponse.json(getPublicCapabilitiesPayload(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400", "Access-Control-Allow-Origin": "*" } });
}
