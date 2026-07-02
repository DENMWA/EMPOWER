import { NextResponse } from "next/server";

type ImproveNoteRequest = {
  transcript?: string;
};

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

function localFidelityRewrite(transcript: string) {
  const originalNote = transcript.trim() || "No original shift note entered.";
  const personCentredNote = originalNote
    .replace(/aggressive/gi, "presented as distressed and raised their voice")
    .replace(/difficult/gi, "needed additional support at that time")
    .replace(/manipulative/gi, "communicated a need in a way staff found unclear")
    .replace(/non-compliant/gi, "declined the prompt at that time")
    .replace(/refused to listen/gi, "declined staff prompts at that time")
    .replace(/attention-seeking/gi, "sought staff attention")
    .replace(/bad behaviour/gi, "behaviour of concern")
    .replace(/lazy/gi, "did not engage with the task at that time")
    .replace(/naughty/gi, "required support to follow the routine")
    .replace(/meltdown/gi, "period of visible distress");

  const professionalRewrite = [
    "The participant was supported with the activity described in the original shift note. The worker's note indicates what occurred, the participant's presentation or response, and the support provided by staff.",
    "",
    `Expanded person-centred wording: ${personCentredNote}`,
    "",
    "Staff actions and support provided should be read only from the original note above. Any additional operational details, clinical details, risk ratings, notifications, or outcomes must be confirmed before this record is approved."
  ].join("\n");

  return [
    "Original shift note preserved:",
    originalNote,
    "",
    "Professional rewrite within documented facts:",
    professionalRewrite,
    "",
    "Clear boundaries for review:",
    "- This rewrite expands the note into a professional structure while staying inside the worker's documented facts.",
    "- Any missing details, such as exact location, times, goal links, injuries, notifications, or follow-up owner, must be confirmed by the worker or manager before approval.",
    "- Suggested language changes are for clarity, person-centred wording, and objective documentation only."
  ].join("\n");
}

export async function POST(request: Request) {
  const { transcript = "" } = await request.json() as ImproveNoteRequest;
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) {
    return NextResponse.json({ error: "Enter an original shift note first." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      note: localFidelityRewrite(cleanTranscript),
      source: "local-fallback",
      warning: "OPENAI_API_KEY is not configured, so EmpowerNotes used the local fidelity rewrite."
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You improve Australian disability support and NDIS-style shift notes.",
            "Preserve fidelity to the worker's original note.",
            "Do not invent facts, times, injuries, notifications, goals, risks, diagnoses, or outcomes.",
            "Expand the note into a richer professional progress note using only reasonable structure and wording based on what is documented.",
            "You may add professional structure such as support provided, participant response, staff actions, outcome, evidence quality, and follow-up prompts, but only where those sections are grounded in the original note.",
            "If a detail is not present, write that it requires confirmation instead of inventing it.",
            "Use objective, person-centred, audit-ready language suitable for disability support documentation.",
            "Always return these exact headings: Original shift note preserved:, Professional rewrite within documented facts:, Clear boundaries for review:.",
            "Under the professional rewrite heading, write a complete expanded note in paragraphs.",
            "Under the boundaries heading, list missing details that require worker or manager confirmation."
          ].join(" ")
        },
        {
          role: "user",
          content: `Original worker shift note:\n${cleanTranscript}`
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({
      note: localFidelityRewrite(cleanTranscript),
      source: "local-fallback",
      warning: `OpenAI request failed, so EmpowerNotes used the local fidelity rewrite. ${detail.slice(0, 240)}`
    }, { status: 200 });
  }

  const data = await response.json();
  const note = data?.choices?.[0]?.message?.content;

  if (!note) {
    return NextResponse.json({
      note: localFidelityRewrite(cleanTranscript),
      source: "local-fallback",
      warning: "OpenAI returned no note content, so EmpowerNotes used the local fidelity rewrite."
    });
  }

  return NextResponse.json({ note, source: "openai-chat", model });
}
