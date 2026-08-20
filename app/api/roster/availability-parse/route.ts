import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/document-text-extraction";
import { guardAiRequest } from "@/lib/security/ai-request-guard";

export const runtime = "nodejs";
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const access = await guardAiRequest(request, { entitlement: "basicPlanParsing", action: "parse_plan", rateLimitAction: "parse_plan", permission: "rostering.manage" });
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !isSupportedAvailabilityFile(file)) return NextResponse.json({ error: "Upload a completed PDF, JPG, PNG or WebP availability form." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "The availability form must be smaller than 10 MB." }, { status: 413 });
    const key = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
    if (!key) return NextResponse.json({ error: "AI availability extraction is not configured." }, { status: 503 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? await createPdfAvailabilityPrompt(buffer)
      : createVisionAvailabilityPrompt(file, buffer);
    if ("error" in content) return NextResponse.json({ error: content.error }, { status: content.status });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini", store: false, temperature: 0, response_format: { type: "json_object" }, messages: [
        { role: "system", content: "Extract employee availability facts only. Return JSON as {\"lines\":[{\"weekday\":0,\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"kind\":\"available\",\"notes\":\"\"}]}. weekday is 0 Sunday through 6 Saturday. kind must be available, preferred, or unavailable. Do not infer missing times or availability. Omit blank days." },
        { role: "user", content: content.prompt }
      ] })
    });
    if (!response.ok) return NextResponse.json({ error: "AI could not read this form right now." }, { status: 502 });
    const data = await response.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}") as { lines?: Array<Record<string, unknown>> };
    const lines = (parsed.lines || []).filter(validLine).slice(0, 14).map((line) => ({
      id: crypto.randomUUID(), weekday: Number(line.weekday), day: weekdays[Number(line.weekday)], startTime: String(line.startTime), endTime: String(line.endTime),
      kind: line.kind, notes: typeof line.notes === "string" ? line.notes.slice(0, 300) : ""
    }));
    if (!lines.length) return NextResponse.json({ error: "No complete availability lines were found. Review the form and ensure days and times are entered." }, { status: 422 });
    await access.gate.recordUsage();
    return NextResponse.json({ fileName: file.name, lines, source: content.source, advisory: "AI extraction requires admin review before publication." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Availability extraction failed." }, { status: 500 });
  }
}

function isSupportedAvailabilityFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf") || imageTypes.has(file.type);
}

async function createPdfAvailabilityPrompt(buffer: Buffer): Promise<{ prompt: string; source: "pdf-text" } | { error: string; status: number }> {
  const extracted = (await extractPdfText(buffer)).replace(/\s+/g, " ").trim().slice(0, 16000);
  if (extracted.length < 30) {
    return { error: "This scanned PDF has no readable text. Upload a clear JPG, PNG or WebP photo of the handwritten form so AI vision can review it.", status: 422 };
  }
  return { prompt: `Availability form text:\n${extracted}`, source: "pdf-text" };
}

function createVisionAvailabilityPrompt(file: File, buffer: Buffer) {
  return {
    source: "vision-image" as const,
    prompt: [
      {
        type: "text",
        text: "Read this handwritten or scanned employee availability form. Extract only clear availability facts. If handwriting is unclear, omit that line or add a short uncertainty note. Do not infer missing times or availability."
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${file.type};base64,${buffer.toString("base64")}`,
          detail: "high"
        }
      }
    ]
  };
}

function validLine(line: Record<string, unknown>) {
  return Number.isInteger(Number(line.weekday)) && Number(line.weekday) >= 0 && Number(line.weekday) <= 6
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(line.startTime)) && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(line.endTime))
    && String(line.endTime) > String(line.startTime) && ["available", "preferred", "unavailable"].includes(String(line.kind));
}
