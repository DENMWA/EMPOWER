import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const email = resolved.context.email;
  if (!email) return NextResponse.json({ error: "No email address is on file for this account." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Email confirmation is not configured." }, { status: 503 });

  try {
    const response = await fetch(`${url}/auth/v1/resend`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "signup", email }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: `Could not send the confirmation email (${response.status}).`, detail }, { status: 502 });
    }
    return NextResponse.json({ ok: true, email });
  } catch {
    return NextResponse.json({ error: "The email service is temporarily unavailable. Try again shortly." }, { status: 502 });
  }
}
