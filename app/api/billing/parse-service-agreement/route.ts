import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/security/ai-request-guard";

export const runtime = "nodejs";

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
const maxFileBytes = 10 * 1024 * 1024;

async function extractText(file: File) {
  if (file.size > maxFileBytes) throw new Error("The service agreement must be smaller than 10 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "pdf") return ((await import("pdf-parse")).default(buffer)).then((result) => result.text || "");
  if (extension === "docx") return (await import("mammoth")).extractRawText({ buffer }).then((result) => result.value || "");
  if (extension === "txt" || file.type.startsWith("text/")) return buffer.toString("utf8");
  throw new Error("Upload a PDF, DOCX or TXT service agreement.");
}

export async function POST(request: Request) {
  try {
    const access = await guardAiRequest(request, { entitlement: "basicPlanParsing", action: "parse_plan" });
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    if (!apiKey) return NextResponse.json({ error: "ChatGPT agreement extraction is not configured." }, { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a service agreement first." }, { status: 400 });
    const text = (await extractText(file)).replace(/\s+/g, " ").trim().slice(0, 30000);
    if (text.length < 30) return NextResponse.json({ error: "No readable agreement text was found." }, { status: 422 });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Extract billing terms from an Australian NDIS service agreement for human review.",
              "Return JSON only with agreementName, startDate, endDate, billingFrequency, recipientName, recipientEmail, and items.",
              "Each item must contain supportItemNumber, supportItemName, agreedRate, unitType, budgetAllocated, allowTravel, allowKilometres, allowNonFaceToFace, allowCancellations, confidence and sourceText.",
              "unitType must be hour, day, week, month, each, or km. Dates must be YYYY-MM-DD.",
              "Use null or an empty string when a value is absent. Never infer a rate, code, budget, permission, date, participant, or recipient that is not explicitly written.",
              "Keep sourceText short and close to the wording that supports the extracted rate."
            ].join(" ")
          },
          { role: "user", content: `Service agreement text:\n${text}` }
        ]
      })
    });
    if (!response.ok) throw new Error("ChatGPT could not read this agreement right now.");
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("ChatGPT returned no readable agreement data.");
    const parsed = JSON.parse(content);
    await access.gate.recordUsage();
    return NextResponse.json({ ...parsed, sourceFileName: file.name, reviewStatus: "pending" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agreement extraction failed." }, { status: 500 });
  }
}
