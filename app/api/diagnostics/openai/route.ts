import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyServerAccess(request, "platform");
  if (!access.allowed) {
    return NextResponse.json({ ok: false, error: access.reason }, { status: access.status });
  }

  const configured = Boolean(process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"]);
  return NextResponse.json({
    ok: configured,
    service: "OpenAI",
    status: configured ? "configured" : "configuration_required",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  });
}
