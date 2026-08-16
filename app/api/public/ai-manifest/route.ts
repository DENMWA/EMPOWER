import { NextResponse } from "next/server";
import { getAiManifest } from "@/lib/ai-discoverability";

export function GET() {
  return NextResponse.json(getAiManifest(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400", "Access-Control-Allow-Origin": "*" } });
}
