import { NextResponse } from "next/server";

export const runtime = "nodejs";

function describeKey(name: string) {
  const value = process.env[name];
  return {
    name,
    configured: Boolean(value),
    looksLikeOpenAiSecret: typeof value === "string" && value.startsWith("sk-"),
    length: typeof value === "string" ? value.length : 0
  };
}

export async function GET() {
  const keys = [describeKey("OPENAI_API_KEY"), describeKey("EMPOWERNOTES_CHAT_KEY")];
  const selected = keys.find((key) => key.configured);

  return NextResponse.json({
    ok: Boolean(selected?.looksLikeOpenAiSecret),
    selectedKeyName: selected?.name ?? null,
    keys,
    note: "This endpoint only confirms whether expected OpenAI environment variables are visible to the deployed server. It never returns secret values."
  });
}
