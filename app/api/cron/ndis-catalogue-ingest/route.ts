import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { importOfficialNdisPricingUpload } from "@/lib/ndis-pricing-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: Request) {
  const configured = process.env.NDIS_CATALOGUE_INGEST_SECRET || "";
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised catalogue relay." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Pricing monitoring is not configured." }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const effectiveFrom = String(form.get("effectiveFrom") || "");
    if (!(file instanceof File)) return NextResponse.json({ error: "The official catalogue file is required." }, { status: 400 });
    return NextResponse.json(await importOfficialNdisPricingUpload({ url, serviceKey }, file, effectiveFrom));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalogue relay failed." }, { status: 500 });
  }
}
