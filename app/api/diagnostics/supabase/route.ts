import { NextResponse } from "next/server";

export const runtime = "nodejs";

function describePresence(name: string) {
  const value = process.env[name];
  return {
    name,
    configured: Boolean(value),
    length: typeof value === "string" ? value.length : 0
  };
}

function describeSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    return {
      configured: false,
      host: null,
      projectRef: null,
      validSupabaseUrl: false
    };
  }

  try {
    const url = new URL(value);
    const projectRef = url.hostname.endsWith(".supabase.co") ? url.hostname.replace(".supabase.co", "") : null;

    return {
      configured: true,
      host: url.hostname,
      projectRef,
      validSupabaseUrl: Boolean(projectRef)
    };
  } catch {
    return {
      configured: true,
      host: null,
      projectRef: null,
      validSupabaseUrl: false
    };
  }
}

async function checkRestHealth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      checked: false,
      ok: false,
      status: null,
      message: "Supabase URL or anon key is missing."
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/organisations?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      },
      cache: "no-store"
    });

    return {
      checked: true,
      ok: response.ok || response.status === 401,
      status: response.status,
      message: response.ok
        ? "Connected to Supabase REST."
        : response.status === 401
          ? "Reached Supabase REST, but access is protected by policies."
          : await response.text()
    };
  } catch (error) {
    return {
      checked: true,
      ok: false,
      status: null,
      message: error instanceof Error ? error.message : "Unable to reach Supabase REST."
    };
  }
}

export async function GET() {
  const url = describeSupabaseUrl();
  const keys = [
    describePresence("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    describePresence("SUPABASE_SERVICE_ROLE_KEY")
  ];
  const rest = await checkRestHealth();

  return NextResponse.json({
    ok: url.validSupabaseUrl && keys[0].configured && rest.ok,
    url,
    keys,
    rest,
    note: "This endpoint confirms which Supabase project the deployed app can see. It never returns secret key values."
  });
}
