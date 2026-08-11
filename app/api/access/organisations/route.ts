import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!url || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) return NextResponse.json({ organisations: [] }, { status: 401 });
  const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization }, cache: "no-store" });
  const user = authResponse.ok ? await authResponse.json() as { id?: string } : {};
  if (!user.id) return NextResponse.json({ organisations: [] }, { status: 401 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const membershipResponse = await fetch(`${url}/rest/v1/organisation_memberships?select=id,organisation_id,role&user_id=eq.${user.id}&access_status=eq.active`, { headers, cache: "no-store" });
  const memberships = membershipResponse.ok ? await membershipResponse.json() as Array<{ id: string; organisation_id: string; role: string }> : [];
  if (!memberships.length) return NextResponse.json({ organisations: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const ids = memberships.map((item) => item.organisation_id).join(",");
  const organisationResponse = await fetch(`${url}/rest/v1/organisations?select=id,name&id=in.(${ids})`, { headers, cache: "no-store" });
  const names = new Map((organisationResponse.ok ? await organisationResponse.json() as Array<{ id: string; name: string }> : []).map((item) => [item.id, item.name]));
  return NextResponse.json({ organisations: memberships.map((membership) => ({ id: membership.organisation_id, membershipId: membership.id, name: names.get(membership.organisation_id) || "Organisation", role: membership.role })) }, { headers: { "Cache-Control": "private, no-store" } });
}
