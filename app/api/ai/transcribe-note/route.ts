import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/security/ai-request-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await guardAiRequest(request, { entitlement: "goalLinkedNotes", action: "transcribe_note" });
  if (!guard.ok) return NextResponse.json({ message: guard.message }, { status: guard.status, headers: guard.retryAfterSeconds ? { "Retry-After": String(guard.retryAfterSeconds) } : undefined });

  const apiKey = process.env.OPENAI_API_KEY || process.env.EMPOWERNOTES_CHAT_KEY || process.env.EmpowerNotes_chat_key;
  if (!apiKey) return NextResponse.json({ message: "Voice transcription is not configured." }, { status: 503 });
  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.size) return NextResponse.json({ message: "No recording was received." }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ message: "The recording is too large. Keep voice notes under five minutes." }, { status: 413 });

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "progress-note.webm");
  upstream.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1");
  upstream.append("language", "en");
  upstream.append("prompt", "Australian disability support progress note. Preserve names and support terminology accurately.");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: upstream });
  if (!response.ok) return NextResponse.json({ message: "The voice service could not transcribe this recording. Try again shortly." }, { status: response.status >= 500 ? 503 : 422 });
  const result = await response.json() as { text?: string };
  if (!result.text?.trim()) return NextResponse.json({ message: "No speech was detected in the recording." }, { status: 422 });
  return NextResponse.json({ transcript: result.text.trim() });
}
