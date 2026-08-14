import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/security/ai-request-guard";

type Candidate = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  timeBand?: string;
  region?: string;
  remoteType?: string;
  price: number;
};

type MatchRequest = {
  service?: { supportType?: string; title?: string; date?: string; startTime?: string; endTime?: string; location?: string; staffingRatio?: string };
  candidates?: Candidate[];
};

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
const maxCandidates = 8;

export async function POST(request: Request) {
  const access = await guardAiRequest(request, { entitlement: "enabled", action: "match_ndis_service", rateLimitAction: "transcribe_note", permission: "billing.manage" });
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  let body: MatchRequest;
  try {
    body = await request.json() as MatchRequest;
  } catch {
    return NextResponse.json({ error: "Send a valid NDIS matching request." }, { status: 400 });
  }

  const candidates = (body.candidates || []).slice(0, maxCandidates).filter((candidate) =>
    candidate && typeof candidate.id === "string" && typeof candidate.code === "string"
      && typeof candidate.price === "number" && Number.isFinite(candidate.price) && candidate.price > 0
  );
  if (!candidates.length) return NextResponse.json({ error: "No active priced catalogue candidates are available." }, { status: 422 });

  const fallback = { candidateId: candidates[0].id, confidence: 0, reason: "Top rules-based catalogue match. Review before authorising.", usedAi: false };
  if (!apiKey) return NextResponse.json(fallback);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Rank a delivered disability support service against the supplied official NDIS catalogue candidates.",
              "Return JSON only: {\"candidateId\":\"...\",\"confidence\":0.0,\"reason\":\"...\"}.",
              "candidateId must exactly match one supplied candidate id. Never create a code, candidate, rate or service fact.",
              "Use service type, date, time, location, staffing ratio, category, unit, time band, region and remote type.",
              "Keep reason under 160 characters. This is an advisory ranking for human authorisation."
            ].join(" ")
          },
          { role: "user", content: JSON.stringify({ service: body.service || {}, candidates }) }
        ]
      })
    });
    if (!response.ok) return NextResponse.json(fallback);
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return NextResponse.json(fallback);
    const parsed = JSON.parse(content) as { candidateId?: unknown; confidence?: unknown; reason?: unknown };
    const candidateId = typeof parsed.candidateId === "string" ? parsed.candidateId : "";
    if (!candidates.some((candidate) => candidate.id === candidateId)) return NextResponse.json(fallback);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 160) : "AI-ranked catalogue match. Review before authorising.";
    await access.gate.recordUsage();
    return NextResponse.json({ candidateId, confidence, reason, usedAi: true, model });
  } catch {
    return NextResponse.json(fallback);
  }
}
