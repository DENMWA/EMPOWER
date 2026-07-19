import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExtractionType = "goal" | "support_need" | "risk" | "support_strategy" | "baseline_indicator";

type ParsedPlanItem = {
  id: string;
  extractionType: ExtractionType;
  title: string;
  originalText: string;
  interpretedText: string;
  sourcePage: number;
  sourceSection: string;
  confidenceScore: number;
  verificationStatus: "pending";
};

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openAiApiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
const maxFileBytes = 10 * 1024 * 1024;
const maxTextChars = 24000;

function fileExtension(fileName: string) {
  return fileName.toLowerCase().split(".").pop() || "";
}

async function extractTextFromFile(file: File) {
  const extension = fileExtension(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > maxFileBytes) {
    throw new Error("This file is larger than 10MB. Upload a smaller plan document for parsing.");
  }

  if (extension === "txt" || file.type.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  if (extension === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || "";
  }

  if (extension === "doc") {
    throw new Error("Legacy .doc files are not supported yet. Save the plan as DOCX or PDF, then upload again.");
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT plan document.");
}

function normaliseText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxTextChars);
}

function titleFromText(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 70 ? `${clean.slice(0, 67)}...` : clean || "Plan item";
}

function makeItem(index: number, extractionType: ExtractionType, text: string): ParsedPlanItem {
  return {
    id: `plan-extraction-${Date.now()}-${index}`,
    extractionType,
    title: titleFromText(text),
    originalText: text,
    interpretedText: text,
    sourcePage: 1,
    sourceSection: "Uploaded plan text",
    confidenceScore: 0.62,
    verificationStatus: "pending"
  };
}

function localExtractPlanItems(text: string) {
  const sentences = text
    .split(/[.!?]\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);

  const matchers: Array<{ type: ExtractionType; patterns: RegExp[] }> = [
    { type: "goal", patterns: [/goal/i, /increase/i, /improve/i, /develop/i, /maintain/i, /build/i] },
    { type: "risk", patterns: [/risk/i, /incident/i, /behaviour/i, /falls?/i, /safeguard/i, /medical/i] },
    { type: "support_strategy", patterns: [/support/i, /prompt/i, /strategy/i, /assist/i, /supervision/i] },
    { type: "support_need", patterns: [/need/i, /requires/i, /daily living/i, /communication/i, /personal care/i] },
    { type: "baseline_indicator", patterns: [/currently/i, /baseline/i, /requires assistance/i, /independent/i] }
  ];

  const items: ParsedPlanItem[] = [];
  for (const matcher of matchers) {
    const sentence = sentences.find((candidate) => matcher.patterns.some((pattern) => pattern.test(candidate)));
    if (sentence && !items.some((item) => item.originalText === sentence)) {
      items.push(makeItem(items.length + 1, matcher.type, sentence));
    }
  }

  return items.length ? items.slice(0, 8) : [makeItem(1, "support_need", text.slice(0, 320) || "No readable plan text found.")];
}

function parseOpenAiItems(content: string): ParsedPlanItem[] {
  const parsed = JSON.parse(content) as { items?: Array<Partial<ParsedPlanItem>> };
  if (!Array.isArray(parsed.items)) return [];

  return parsed.items
    .filter((item) => typeof item.title === "string" && typeof item.interpretedText === "string")
    .slice(0, 10)
    .map((item, index) => ({
      id: `plan-extraction-${Date.now()}-${index + 1}`,
      extractionType: item.extractionType || "support_need",
      title: item.title || "Plan item",
      originalText: item.originalText || item.interpretedText || "",
      interpretedText: item.interpretedText || "",
      sourcePage: Number(item.sourcePage) || 1,
      sourceSection: item.sourceSection || "Uploaded plan text",
      confidenceScore: typeof item.confidenceScore === "number" ? Math.max(0, Math.min(1, item.confidenceScore)) : 0.72,
      verificationStatus: "pending"
    }));
}

async function extractWithAi(text: string) {
  if (!openAiApiKey) return { items: localExtractPlanItems(text), source: "local-parser" };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You extract structured plan evidence from Australian disability, NDIS, allied health, and support plan documents.",
            "Return JSON only as {\"items\":[...]}.",
            "Each item must include extractionType, title, originalText, interpretedText, sourcePage, sourceSection, confidenceScore.",
            "Allowed extractionType values are goal, support_need, risk, support_strategy, baseline_indicator.",
            "Do not invent plan content. Only extract information present in the supplied text.",
            "Keep originalText as close as possible to the source wording.",
            "Use interpretedText to make the item clear for human verification."
          ].join(" ")
        },
        {
          role: "user",
          content: `Uploaded plan text:\n${text}`
        }
      ]
    })
  });

  if (!response.ok) return { items: localExtractPlanItems(text), source: "local-parser" };

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { items: localExtractPlanItems(text), source: "local-parser" };

  try {
    const items = parseOpenAiItems(content);
    return { items: items.length ? items : localExtractPlanItems(text), source: items.length ? "openai-chat" : "local-parser" };
  } catch {
    return { items: localExtractPlanItems(text), source: "local-parser" };
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a plan document before parsing." }, { status: 400 });
    }

    const text = normaliseText(await extractTextFromFile(file));
    if (!text || text.length < 20) {
      return NextResponse.json({ error: "No readable text could be extracted from this document. Try a text-based PDF or DOCX file." }, { status: 422 });
    }

    const result = await extractWithAi(text);
    return NextResponse.json({
      fileName: file.name,
      textPreview: text.slice(0, 600),
      source: result.source,
      items: result.items
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Plan parsing failed." }, { status: 500 });
  }
}
