import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssignmentRow = { shift_id: string; staff_user_id: string | null; staff_invite_id: string | null };
type ShiftRow = {
  id: string; participant_id: string; title: string | null; support_type: string | null; location: string | null;
  start_time: string; end_time: string; status: string; shift_instructions: string | null; staffing_ratio: string | null;
  note_required: boolean; note_completed: boolean;
};

export async function GET(request: Request) {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Personal roster access is not configured." }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const from = validDate(params.get("from"));
  const to = validDate(params.get("to"));
  if (!from || !to || from > to || daysBetween(from, to) > 62) {
    return NextResponse.json({ error: "Choose a valid roster period of up to 62 days." }, { status: 400 });
  }

  const context = resolved.context;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const invitePath = `staff_invites?select=id&organisation_id=eq.${context.organisationId}&email=ilike.${encodeURIComponent(context.email)}&invite_status=neq.Suspended`;
  const inviteIds = (await getRows<{ id: string }>(url, headers, invitePath)).map((row) => row.id);
  const identityFilters = [`staff_user_id.eq.${context.userId}`, ...inviteIds.map((id) => `staff_invite_id.eq.${id}`)];
  const assignments = await getRows<AssignmentRow>(url, headers, `shift_staff?select=shift_id,staff_user_id,staff_invite_id&organisation_id=eq.${context.organisationId}&or=(${identityFilters.join(",")})`);
  const shiftIds = [...new Set(assignments.map((row) => row.shift_id))];
  if (!shiftIds.length) return NextResponse.json({ shifts: [], worker: { name: context.email.split("@")[0] } });

  // Query a one-day UTC buffer, then enforce the requested period using Sydney calendar dates.
  // This avoids dropping early shifts when daylight-saving changes the local UTC offset.
  const fromIso = `${addDays(from, -1)}T00:00:00Z`;
  const toIso = `${addDays(to, 2)}T00:00:00Z`;
  const candidateShifts = await getRows<ShiftRow>(url, headers, `support_shifts?select=id,participant_id,title,support_type,location,start_time,end_time,status,shift_instructions,staffing_ratio,note_required,note_completed&organisation_id=eq.${context.organisationId}&id=in.(${shiftIds.join(",")})&start_time=gte.${encodeURIComponent(fromIso)}&start_time=lt.${encodeURIComponent(toIso)}&order=start_time.asc`);
  const shifts = candidateShifts.filter((row) => {
    const shiftDate = sydneyPart(row.start_time, "date");
    return shiftDate >= from && shiftDate <= to;
  });
  const participantIds = [...new Set(shifts.map((row) => row.participant_id))];
  const participants = participantIds.length
    ? await getRows<{ id: string; name: string; preferred_name: string | null }>(url, headers, `participants_or_clients?select=id,name,preferred_name&organisation_id=eq.${context.organisationId}&id=in.(${participantIds.join(",")})`)
    : [];
  const names = new Map(participants.map((row) => [row.id, row.preferred_name || row.name]));

  return NextResponse.json({
    worker: { name: context.email.split("@")[0] },
    shifts: shifts.map((row) => ({
      id: row.id,
      participantId: row.participant_id,
      participantName: names.get(row.participant_id) || "Client",
      supportType: row.support_type || row.title || "Support shift",
      location: row.location || "",
      shiftDate: sydneyPart(row.start_time, "date"),
      startTime: sydneyPart(row.start_time, "time"),
      endTime: sydneyPart(row.end_time, "time"),
      shiftInstructions: row.shift_instructions || "",
      staffingRatio: row.staffing_ratio || "1:1",
      status: normaliseStatus(row.status),
      noteRequired: row.note_required,
      noteCompleted: row.note_completed
    }))
  });
}

async function getRows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Personal roster query failed (${response.status}).`);
  return response.json() as Promise<T[]>;
}

function validDate(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""; }
function daysBetween(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000); }
function addDays(value: string, amount: number) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
function sydneyPart(value: string, part: "date" | "time") { return new Intl.DateTimeFormat(part === "date" ? "en-CA" : "en-AU", part === "date" ? { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" } : { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
function normaliseStatus(value: string) { return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
