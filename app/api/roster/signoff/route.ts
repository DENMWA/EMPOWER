import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignOffAction = "start" | "finish";
type AssignmentRow = { shift_id: string; staff_user_id: string | null; staff_invite_id: string | null };
type InviteIdentityRow = { id: string };
type AcceptedInviteIdentityRow = { staff_invite_id: string | null };
type ShiftRow = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  note_required: boolean;
};

export async function POST(request: Request) {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Shift sign-off is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { shiftId?: string; action?: SignOffAction; note?: string } | null;
  if (!body?.shiftId || !["start", "finish"].includes(body.action || "")) {
    return NextResponse.json({ error: "Choose the shift and sign-off action." }, { status: 400 });
  }

  const context = resolved.context;
  const headers = serviceHeaders(key);
  const authorised = await workerCanUseShift(url, headers, context.organisationId, context.userId, context.email, body.shiftId);
  if (!authorised) return NextResponse.json({ error: "This shift is not assigned to your roster." }, { status: 403 });

  const [shift] = await rows<ShiftRow>(url, headers, `support_shifts?select=id,start_time,end_time,status,note_required&organisation_id=eq.${context.organisationId}&id=eq.${encodeURIComponent(body.shiftId)}&limit=1`);
  if (!shift) return NextResponse.json({ error: "This shift could not be found." }, { status: 404 });
  if (["cancelled", "no_show"].includes(shift.status)) {
    return NextResponse.json({ error: "Cancelled shifts cannot be signed on or off." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update = body.action === "start"
    ? {
        actual_start_time: now,
        shift_signoff_status: "started",
        status: "in_progress",
        shift_signed_off_by: context.userId,
        updated_by: context.userId,
        updated_at: now
      }
    : {
        actual_end_time: now,
        shift_signoff_status: "finished",
        shift_signoff_note: String(body.note || "").trim() || null,
        status: "completed",
        shift_signed_off_by: context.userId,
        updated_by: context.userId,
        updated_at: now
      };

  const response = await fetch(`${url}/rest/v1/support_shifts?organisation_id=eq.${context.organisationId}&id=eq.${encodeURIComponent(body.shiftId)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(update),
    cache: "no-store"
  });
  if (!response.ok) return databaseError(response, "Shift sign-off could not be saved.");

  const [saved] = await response.json() as Array<ShiftRow & { actual_start_time: string | null; actual_end_time: string | null; shift_signoff_note: string | null; shift_signoff_status: string | null }>;
  return NextResponse.json({
    ok: true,
    shift: {
      id: body.shiftId,
      status: normaliseStatus(saved?.status || update.status),
      actualStartTime: formatSydneyTime(saved?.actual_start_time || (body.action === "start" ? now : "")),
      actualEndTime: saved?.actual_end_time ? formatSydneyTime(saved.actual_end_time) : body.action === "finish" ? formatSydneyTime(now) : undefined,
      shiftSignOffStatus: body.action === "start" ? "Started" : "Finished",
      shiftSignOffNote: saved?.shift_signoff_note || undefined
    }
  });
}

async function workerCanUseShift(url: string, headers: Record<string, string>, organisationId: string, userId: string, email: string, shiftId: string) {
  const emailInviteRows = email
    ? await rows<InviteIdentityRow>(url, headers, `staff_invites?select=id&organisation_id=eq.${organisationId}&email=ilike.${encodeURIComponent(email)}&invite_status=neq.Suspended`)
    : [];
  const acceptedInviteRows = await rows<AcceptedInviteIdentityRow>(url, headers, `organisation_invites?select=staff_invite_id&organisation_id=eq.${organisationId}&auth_user_id=eq.${userId}&status=eq.accepted`);
  const inviteIds = [...new Set([
    ...emailInviteRows.map((row) => row.id),
    ...acceptedInviteRows.map((row) => row.staff_invite_id || "").filter(Boolean)
  ])];
  const identityFilters = [`staff_user_id.eq.${userId}`, ...inviteIds.map((id) => `staff_invite_id.eq.${id}`)];
  const assignments = await rows<AssignmentRow>(url, headers, `shift_staff?select=shift_id,staff_user_id,staff_invite_id&organisation_id=eq.${organisationId}&shift_id=eq.${encodeURIComponent(shiftId)}&or=(${identityFilters.join(",")})`);
  return assignments.length > 0;
}

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function rows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!response.ok) return [];
  return response.json() as Promise<T[]>;
}

async function databaseError(response: Response, fallback: string) {
  const detail = await response.text();
  console.error(fallback, response.status, detail);
  return NextResponse.json({ error: fallback }, { status: 502 });
}

function formatSydneyTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
}

function normaliseStatus(value: string) {
  return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
