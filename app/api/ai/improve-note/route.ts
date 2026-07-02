import { NextResponse } from "next/server";

type ImproveNoteRequest = {
  transcript?: string;
};

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

function personCentredLanguage(text: string) {
  return text
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
}

function localFidelityOptions(transcript: string) {
  const originalNote = transcript.trim() || "No original shift note entered.";
  const cleaned = personCentredLanguage(originalNote);

  return [
    `The participant was supported with the activity described in the shift note. ${cleaned} Staff provided support in line with the documented interaction and recorded the participant's response. Any missing details, including exact time, location, goal link, or follow-up owner, should be confirmed before approval.`,
    `During the shift, staff supported the participant with the recorded activity and documented the participant's presentation and response. ${cleaned} The note has been written in objective, person-centred language while staying within the facts provided by the worker.`,
    `Staff provided support as described in the original shift note. ${cleaned} The record should be reviewed for any missing operational details, such as support duration, location, goal connection, notifications, and follow-up actions, before it is finalised.`
  ];
}

function parseOptionsFromContent(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.options)) {
      return parsed.options.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3);
    }
  } catch {
    return content.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
  }

  return [];
}

export async function POST(request: Request) {
  const { transcript = "" } = await request.json() as ImproveNoteRequest;
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) {
    return NextResponse.json({ error: "Enter an original shift note first." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      options: localFidelityOptions(cleanTranscript),
      source: "local-fallback"
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
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You improve Australian disability support and NDIS-style shift notes.",
            "Return JSON only in this shape: {\"options\":[\"...\",\"...\",\"...\"]}.",
            "Write exactly three rephrased professional note options.",
            "Each option must be a clean final note the worker can click and use directly.",
            "Do not include headings, disclaimers, boundaries, AI service notes, markdown, or bullet lists.",
            "Preserve fidelity to the worker's original note while expanding professionally.",
            "Do not invent facts, times, injuries, notifications, goals, risks, diagnoses, or outcomes.",
            "Expand the note into a richer professional progress note using only reasonable structure and wording based on what is documented.",
            "You may add professional structure such as support provided, participant response, staff actions, outcome, evidence quality, and follow-up prompts, but only where those sections are grounded in the original note.",
            "If a detail is not present, do not mention it unless a short confirmation sentence is clinically useful.",
            "Use objective, person-centred, audit-ready language suitable for disability support documentation."
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
    return NextResponse.json({
      options: localFidelityOptions(cleanTranscript),
      source: "local-fallback"
    }, { status: 200 });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const options = typeof content === "string" ? parseOptionsFromContent(content) : [];

  if (!options.length) {
    return NextResponse.json({
      options: localFidelityOptions(cleanTranscript),
      source: "local-fallback"
    });
  }

  return NextResponse.json({ options, source: "openai-chat", model });
}
