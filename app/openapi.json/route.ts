import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/ai-discoverability";

export function GET() {
  return NextResponse.json(getOpenApiDocument(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400", "Access-Control-Allow-Origin": "*" } });
}
