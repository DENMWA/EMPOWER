import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InviteRow = { id: string; name: string };
type AvailabilityRow = { weekday: number | null; start_time: string; end_time: string; availability_kind: string };

export async function GET(request: Request) {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const context = resolved.context;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Availability is not configured." }, { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  if (!context.email) return NextResponse.json({ staffInviteId: "", name: "", entries: [] });

  const invites = await getRows<InviteRow>(url, headers, `staff_invites?select=id,name&organisation_id=eq.${context.organisationId}&email=ilike.${encodeURIComponent(context.email)}&invite_status=neq.Suspended&limit=1`);
  const invite = invites[0];
  if (!invite) return NextResponse.json({ staffInviteId: "", name: "", entries: [] });

  const rows = await getRows<AvailabilityRow>(url, headers, `staff_availability?select=weekday,start_time,end_time,availability_kind&organisation_id=eq.${context.organisationId}&staff_invite_id=eq.${invite.id}&specific_date=is.null&order=weekday.asc`);
  const entries = rows
    .filter((row) => row.weekday !== null)
    .map((row) => ({ weekday: row.weekday as number, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), kind: row.availability_kind }));

  return NextResponse.json({ staffInviteId: invite.id, name: invite.name, entries });
}

async function getRows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!response.ok) return [];
  return response.json() as Promise<T[]>;
}
