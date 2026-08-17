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
  if (!candidates.length) {
    await recordMatchEvent(access.gate.organisationId, { outcome: "failure", match_source: "none", failure_category: "no_priced_candidates", candidate_count: 0 });
    return NextResponse.json({ error: "No active priced catalogue candidates are available." }, { status: 422 });
  }

  const fallback = { candidateId: candidates[0].id, confidence: 0, reason: "Top rules-based catalogue match. Review before authorising.", usedAi: false };
  if (!apiKey) {
    await recordSuccess(access.gate.organisationId, candidates, fallback.candidateId, "rules", fallback.confidence, "ai_not_configured");
    return NextResponse.json(fallback);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        store: false,
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
    if (!response.ok) {
      await recordSuccess(access.gate.organisationId, candidates, fallback.candidateId, "rules", fallback.confidence, `ai_http_${response.status}`);
      return NextResponse.json(fallback);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      await recordSuccess(access.gate.organisationId, candidates, fallback.candidateId, "rules", fallback.confidence, "ai_empty_response");
      return NextResponse.json(fallback);
    }
    const parsed = JSON.parse(content) as { candidateId?: unknown; confidence?: unknown; reason?: unknown };
    const candidateId = typeof parsed.candidateId === "string" ? parsed.candidateId : "";
    if (!candidates.some((candidate) => candidate.id === candidateId)) {
      await recordSuccess(access.gate.organisationId, candidates, fallback.candidateId, "rules", fallback.confidence, "ai_invalid_candidate");
      return NextResponse.json(fallback);
    }
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 160) : "AI-ranked catalogue match. Review before authorising.";
    await access.gate.recordUsage();
    await recordSuccess(access.gate.organisationId, candidates, candidateId, "ai", confidence);
    return NextResponse.json({ candidateId, confidence, reason, usedAi: true, model });
  } catch {
    await recordSuccess(access.gate.organisationId, candidates, fallback.candidateId, "rules", fallback.confidence, "ai_request_failed");
    return NextResponse.json(fallback);
  }
}

async function recordSuccess(organisationId: string, candidates: Candidate[], candidateId: string, source: "ai" | "rules", confidence: number, fallbackCategory?: string) {
  const selected = candidates.find((candidate) => candidate.id === candidateId);
  if (!selected) return recordMatchEvent(organisationId, { outcome: "failure", match_source: "none", failure_category: "candidate_not_found", candidate_count: candidates.length });
  return recordMatchEvent(organisationId, {
    outcome: "success",
    match_source: source,
    failure_category: fallbackCategory || null,
    selected_support_item_number: selected.code,
    selected_price: selected.price,
    confidence,
    candidate_count: candidates.length
  });
}

async function recordMatchEvent(organisationId: string, event: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !organisationId) return;
  try {
    await fetch(`${url}/rest/v1/ndis_invoice_match_events`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ organisation_id: organisationId, ...event }),
      cache: "no-store"
    });
  } catch {
    // Telemetry must never interrupt invoicing.
  }
}
