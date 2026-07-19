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

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openAiApiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
const maxFileBytes = 10 * 1024 * 1024;
const maxTextChars = 24000;
const extractionTypes: ExtractionType[] = ["goal", "support_need", "risk", "support_strategy", "baseline_indicator"];

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

function parseOpenAiItems(content: string): ParsedPlanItem[] {
  const parsed = JSON.parse(content) as { items?: Array<Partial<ParsedPlanItem>> };
  if (!Array.isArray(parsed.items)) return [];

  return parsed.items
    .filter((item) => typeof item.title === "string" && typeof item.interpretedText === "string")
    .slice(0, 10)
    .map((item, index) => ({
      id: `plan-extraction-${Date.now()}-${index + 1}`,
      extractionType: extractionTypes.includes(item.extractionType as ExtractionType) ? item.extractionType as ExtractionType : "support_need",
      title: item.title || "Plan item",
      originalText: item.originalText || item.interpretedText || "",
      interpretedText: item.interpretedText || "",
      sourcePage: Number(item.sourcePage) || 1,
      sourceSection: item.sourceSection || "Uploaded plan text",
      confidenceScore: typeof item.confidenceScore === "number" ? Math.max(0, Math.min(1, item.confidenceScore)) : 0.72,
      verificationStatus: "pending"
    }));
}

async function requestChatGptExtraction(messages: ChatMessage[]) {
  if (!openAiApiKey) {
    throw new Error("ChatGPT parsing is not configured. In Vercel, create an Environment Variable named exactly OPENAI_API_KEY or EMPOWERNOTES_CHAT_KEY and paste the OpenAI secret key as the value, then redeploy. A display label such as 'EmpowerNotes chat-key' will not be read by the server unless the environment variable key is one of those exact names.");
  }

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
      messages
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ChatGPT plan parsing failed: ${detail || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("ChatGPT did not return readable extraction content.");
  }

  try {
    return parseOpenAiItems(content);
  } catch {
    throw new Error("ChatGPT returned an invalid extraction format.");
  }
}

function buildExtractionMessages(text: string, mode: "primary" | "broad"): ChatMessage[] {
  const guidance =
    mode === "primary"
      ? "Prioritise participant goals, support needs, risks, support strategies, and baseline indicators. If the document is a policy, behaviour support assessment guide, allied-health report, or provider guidance rather than a participant plan, still extract the practical requirements that can guide staff review."
      : "The first pass returned no usable items. Extract any practical, review-ready content from this document that could guide disability support documentation, behaviour support review, risk review, staff actions, assessment requirements, data collection, or baseline monitoring.";

  return [
    {
      role: "system",
      content: [
        "You extract structured evidence from Australian disability, NDIS, allied health, behaviour support, support plan, and provider guidance documents for EmpowerNotes.",
        "Return JSON only as {\"items\":[...]}.",
        "Return between 3 and 10 items whenever the uploaded text contains any usable support, risk, assessment, monitoring, reporting, or care guidance.",
        "Each item must include extractionType, title, originalText, interpretedText, sourcePage, sourceSection, confidenceScore.",
        "Allowed extractionType values are goal, support_need, risk, support_strategy, baseline_indicator.",
        "Do not invent names, diagnoses, events, dates, injuries, or participant-specific facts that are not in the text.",
        "Keep originalText short and close to the source wording.",
        "Use interpretedText to explain how the extracted item can be reviewed by a human before being used as a baseline or support guide.",
        guidance
      ].join(" ")
    },
    {
      role: "user",
      content: `Uploaded document text:\n${text}`
    }
  ];
}

async function extractWithAi(text: string) {
  let items = await requestChatGptExtraction(buildExtractionMessages(text, "primary"));

  if (!items.length) {
    items = await requestChatGptExtraction(buildExtractionMessages(text, "broad"));
  }

  if (!items.length) {
    throw new Error("ChatGPT did not find review-ready plan, risk, support strategy, or baseline items in this document. Try a participant plan, behaviour support plan, allied-health report, or a text-based PDF with selectable text.");
  }

  return { items, source: "chatgpt" };
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
