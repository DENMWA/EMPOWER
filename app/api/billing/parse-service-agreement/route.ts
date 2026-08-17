import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/security/ai-request-guard";
import { extractPdfText } from "@/lib/document-text-extraction";

export const runtime = "nodejs";

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env["EmpowerNotes chat-key"];
const maxFileBytes = 10 * 1024 * 1024;

async function extractText(buffer: Buffer, fileName: string, contentType = "") {
  if (buffer.byteLength > maxFileBytes) throw new Error("The service agreement must be smaller than 10 MB.");
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "pdf") return extractPdfText(buffer);
  if (extension === "docx") return (await import("mammoth")).extractRawText({ buffer }).then((result) => result.value || "");
  if (extension === "txt" || contentType.startsWith("text/")) return buffer.toString("utf8");
  throw new Error("The agreement must be a PDF, DOCX or TXT document.");
}

export async function POST(request: Request) {
  let sourceDocumentId = "";
  let organisationId = "";
  try {
    const access = await guardAiRequest(request, { entitlement: "basicPlanParsing", action: "parse_plan", permission: "service_agreements.manage" });
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    if (!apiKey) return NextResponse.json({ error: "ChatGPT agreement extraction is not configured." }, { status: 503 });

    const contentType = request.headers.get("content-type") || "";
    let sourceFileName = "service-agreement";
    organisationId = access.gate.organisationId!;
    let fileBuffer: Buffer;

    if (contentType.includes("application/json")) {
      const body = await request.json() as { documentId?: string };
      sourceDocumentId = body.documentId?.trim() || "";
      if (!sourceDocumentId) return NextResponse.json({ error: "Choose a Document Vault agreement first." }, { status: 400 });
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) return NextResponse.json({ error: "Secure document parsing is not configured." }, { status: 503 });
      const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
      const documentQuery = new URLSearchParams({
        select: "id,document_type,file_path,storage_bucket",
        id: `eq.${sourceDocumentId}`,
        organisation_id: `eq.${access.gate.organisationId!}`,
        limit: "1"
      });
      const documentResponse = await fetch(`${url}/rest/v1/documents?${documentQuery}`, { headers, cache: "no-store" });
      const documents = documentResponse.ok ? await documentResponse.json() as Array<{ id: string; document_type: string; file_path: string; storage_bucket: string }> : [];
      const document = documents[0];
      if (!document || !/service agreement|pricing agreement/i.test(document.document_type)) return NextResponse.json({ error: "The selected Document Vault record is not an accessible service or pricing agreement." }, { status: 404 });
      await fetch(`${url}/rest/v1/documents?id=eq.${encodeURIComponent(document.id)}&organisation_id=eq.${encodeURIComponent(access.gate.organisationId!)}`, { method: "PATCH", headers, body: JSON.stringify({ billing_parse_status: "processing", billing_parse_error: null }) });
      const fileResponse = await fetch(`${url}/storage/v1/object/authenticated/${document.storage_bucket || "participant-documents"}/${encodeURI(document.file_path)}`, { headers, cache: "no-store" });
      if (!fileResponse.ok) throw new Error("The private agreement file could not be read from Document Vault.");
      sourceFileName = document.file_path.split("/").pop() || sourceFileName;
      fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    } else {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose a service agreement first." }, { status: 400 });
      sourceFileName = file.name;
      fileBuffer = Buffer.from(await file.arrayBuffer());
    }

    const text = (await extractText(fileBuffer, sourceFileName, contentType)).replace(/\s+/g, " ").trim().slice(0, 30000);
    if (text.length < 30) return NextResponse.json({ error: "No readable agreement text was found." }, { status: 422 });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model,
        store: false,
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
    if (sourceDocumentId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      await fetch(`${url}/rest/v1/documents?id=eq.${encodeURIComponent(sourceDocumentId)}&organisation_id=eq.${encodeURIComponent(access.gate.organisationId!)}`, {
        method: "PATCH",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ billing_parse_status: "ready", billing_parsed_terms: parsed, billing_parse_error: null, billing_parsed_at: new Date().toISOString() })
      });
    }
    await access.gate.recordUsage();
    return NextResponse.json({ ...parsed, sourceFileName, sourceDocumentId, reviewStatus: "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agreement extraction failed.";
    if (sourceDocumentId && organisationId) await markParseFailed(sourceDocumentId, organisationId, message);
    const documentError = /PDF|document|agreement|readable text|password-protected/i.test(message);
    return NextResponse.json({ error: message, retryable: true, documentSaved: Boolean(sourceDocumentId) }, { status: documentError ? 422 : 500 });
  }
}

async function markParseFailed(documentId: string, organisationId: string, message: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;
  try {
    await fetch(`${url}/rest/v1/documents?id=eq.${encodeURIComponent(documentId)}&organisation_id=eq.${encodeURIComponent(organisationId)}`, {
      method: "PATCH",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ billing_parse_status: "failed", billing_parse_error: message })
    });
  } catch {
    // The uploaded agreement remains available even when status reporting is unavailable.
  }
}
